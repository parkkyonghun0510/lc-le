# Folder Upload Test & Debug Guide

## Current Issue Analysis

Based on the logs you provided:
```
Creating new folder: Borrower Documents for application: 23ed90c6-0403-4b3e-b851-dc53c515cec0
Created folder: Borrower Documents (03573493-1a16-44e4-bac9-756afc6c9472)
Uploading file with folderId: 03573493-1a16-44e4-bac9-756afc6c9472
Upload successful, file folder_id: fe58ac8b-48d9-48ba-9e57-65664a1379a3
```

**Problem**: The file is uploaded with the correct folder ID (`03573493-1a16-44e4-bac9-756afc6c9472`) but ends up in a different folder (`fe58ac8b-48d9-48ba-9e57-65664a1379a3`).

## Debugging Steps Added

### 1. Enhanced Upload Logging
Now logs the exact API call and parameters:
```javascript
console.log(`Upload API call: /files/upload?${qp.toString()}`);
console.log('Upload parameters:', { applicationId, folderId, documentType, fieldName });
console.log('FormData entries:', Array.from(formData.entries()));
```

### 2. Dual Parameter Sending
Sends folder_id in both query parameters AND form data:
```javascript
// Form data
if (folderId) formData.append('folder_id', folderId);

// Query parameters  
if (folderId) qp.append('folder_id', folderId);
```

### 3. Folder Verification
Verifies the created folder exists before using it:
```javascript
const verifyFolder = updatedFoldersData?.items?.find(f => f.id === newFolder.id);
if (verifyFolder) {
  console.log(`Verified folder exists: ${folderName} (${newFolder.id})`);
} else {
  console.warn(`Warning: Created folder not found in list: ${folderName} (${newFolder.id})`);
}
```

## Test Steps

### Step 1: Check Upload Parameters
1. Open browser console
2. Upload a file
3. Look for logs like:
   ```
   Upload API call: /files/upload?application_id=xxx&folder_id=xxx&document_type=photos&field_name=borrower_photo
   Upload parameters: {applicationId: "xxx", folderId: "xxx", documentType: "photos", fieldName: "borrower_photo"}
   FormData entries: [["file", File], ["application_id", "xxx"], ["folder_id", "xxx"], ...]
   ```

### Step 2: Check Network Request
1. Open Network tab in browser dev tools
2. Upload a file
3. Find the `/files/upload` request
4. Check:
   - **Query Parameters**: Should include `folder_id=xxx`
   - **Request Payload**: Should include `folder_id` in form data
   - **Response**: Check if `folder_id` in response matches what was sent

### Step 3: Backend Investigation
If the frontend is sending correct parameters but backend assigns different folder, check:

1. **Backend Logs**: Look for folder_id parameter processing
2. **Database**: Check if the folder ID exists in folders table
3. **API Logic**: Verify backend uses the provided folder_id

## Possible Backend Issues

### Issue 1: Parameter Not Read
Backend might not be reading the `folder_id` parameter correctly.

**Check**: Backend logs should show the received folder_id

**Fix**: Ensure backend reads from correct source (query params vs form data)

### Issue 2: Folder Validation
Backend might be validating folder ownership and falling back to default.

**Check**: Backend logs for folder validation errors

**Fix**: Ensure folder belongs to the application

### Issue 3: Race Condition
Folder might not be fully committed to database when file upload occurs.

**Check**: Increase delay between folder creation and file upload

**Fix**: Add backend-side folder existence validation

## Frontend Fixes Applied

### 1. Dual Parameter Sending
```javascript
// Send in both places to ensure backend receives it
formData.append('folder_id', folderId);  // Form data
qp.append('folder_id', folderId);        // Query params
```

### 2. Enhanced Verification
```javascript
// Verify folder exists before upload
const verifyFolder = updatedFoldersData?.items?.find(f => f.id === newFolder.id);
```

### 3. Better Error Handling
```javascript
if (!verifyFolder) {
  console.warn(`Warning: Created folder not found in list`);
  // Could add fallback logic here
}
```

## Expected Logs After Fix

You should now see logs like:
```
Looking for existing folder: Borrower Documents in 0 folders
Available folders: []
Creating new folder: Borrower Documents for application: xxx
Created folder: Borrower Documents (folder-id-1)
Verified folder exists: Borrower Documents (folder-id-1)
Got folder ID: folder-id-1 for role: borrower
Upload API call: /files/upload?application_id=xxx&folder_id=folder-id-1&document_type=photos&field_name=borrower_photo
Upload parameters: {applicationId: "xxx", folderId: "folder-id-1", ...}
FormData entries: [["file", File], ["application_id", "xxx"], ["folder_id", "folder-id-1"], ...]
Uploading file with folderId: folder-id-1
Upload successful, file folder_id: folder-id-1  ← Should match now!
```

## Backend Requirements

Ensure your backend:

1. **Reads folder_id parameter** from either query params or form data
2. **Validates folder ownership** (folder belongs to the application)
3. **Returns proper error** if folder doesn't exist or access denied
4. **Associates file with folder** in database correctly

## API Contract Verification

### Upload Request Should Include:
```
POST /files/upload?application_id=xxx&folder_id=xxx&document_type=photos&field_name=borrower_photo

Form Data:
- file: [File object]
- application_id: "xxx"
- folder_id: "xxx"
- document_type: "photos"
- field_name: "borrower_photo"
```

### Upload Response Should Return:
```json
{
  "id": "file-id",
  "folder_id": "xxx",  ← Should match the sent folder_id
  "application_id": "xxx",
  "original_filename": "photo.jpg",
  "mime_type": "image/jpeg",
  ...
}
```

## Next Steps

1. **Test with new logs** and check if parameters are sent correctly
2. **Check network request** to verify API call format
3. **Investigate backend** if frontend sends correct parameters but file ends up in wrong folder
4. **Report backend issue** if folder_id parameter is ignored

The issue is likely on the backend side if the frontend is sending the correct folder_id but the file ends up elsewhere.