# File Upload Progress Fix

## Problem
When uploading photos in the Document Attachment step, users experienced:
1. Initial error message showing folder creation failed (500 error)
2. Multiple retry attempts (3 retries with exponential backoff)
3. Eventually the upload succeeds after several seconds
4. Poor user experience with confusing error messages

### Error Logs
```
POST http://localhost:8090/api/v1/folders/ 500 (Internal Server Error)
API request failed, retrying in 1000ms
API request failed, retrying in 2000ms
API request failed, retrying in 4000ms
Failed to create folder: AxiosError
...
[Later] Upload response: {filename: '...', folder_id: '...'}
File uploaded with folder_id: 376539fb-412d-45a3-b132-d959b39edba7
```

## Root Cause
The backend folder creation endpoint (`le-backend/app/routers/folders.py`) had malformed async/await code:

```python
db.add(new_folder)

await db.flush()

await db.refresh(new_folder)
await db.refresh(new_folder)  # Duplicate!

await db.commit()  # Commit AFTER refresh - wrong order!
```

**Issues:**
1. Duplicate `await db.refresh(new_folder)` calls
2. `await db.commit()` was called AFTER `await db.refresh()`, which is incorrect
3. Extra blank lines and poor code structure
4. The `flush()` without `commit()` left the transaction in an inconsistent state

## Solution
Fixed the async/await flow in `le-backend/app/routers/folders.py` (lines 418-431):

**Before:**
```python
db.add(new_folder)

await db.flush()

await db.refresh(new_folder)
await db.refresh(new_folder)

await db.commit()

logger.info(f"Created new folder: {new_folder.name} for application {folder_data.application_id}")

return FolderResponse.from_orm(new_folder)
```

**After:**
```python
db.add(new_folder)
await db.commit()
await db.refresh(new_folder)

logger.info(f"Created new folder: {new_folder.name} for application {folder_data.application_id}")

return FolderResponse.from_orm(new_folder)
```

## Changes Made
1. Removed duplicate `await db.refresh(new_folder)` call
2. Moved `await db.commit()` before `await db.refresh()` (correct order)
3. Removed unnecessary `await db.flush()` call
4. Cleaned up extra blank lines
5. Proper transaction flow: add → commit → refresh

## Testing
To test the fix:

1. Navigate to `/applications/new`
2. Complete steps 0-2 (Customer, Loan, Guarantor info)
3. Go to Step 3 (Document Attachment)
4. Click on any photo upload button (e.g., "Borrower Photo")
5. Select an image file
6. **Expected Result:** 
   - Folder is created successfully on first attempt
   - No error messages or retries
   - File uploads immediately
   - Success message appears promptly

## Technical Details
- **File Modified:** `le-backend/app/routers/folders.py`
- **Lines Changed:** 418-431
- **Impact:** Fixes folder creation for all document uploads
- **Backward Compatible:** Yes, only fixes the async/await flow

## Related Files
- Backend Folders Router: `le-backend/app/routers/folders.py` (lines 418-431)
- Frontend Document Step: `lc-workflow-frontend/app/applications/new/components/DocumentAttachmentStep.tsx`
- Frontend File Hooks: `lc-workflow-frontend/src/hooks/useFiles.ts`

## Additional Notes
The frontend retry mechanism (3 retries with exponential backoff) was working correctly and helped mask this backend issue. However, fixing the backend ensures:
- Faster upload experience
- No unnecessary API calls
- Better server resource utilization
- Clearer error messages when real issues occur
