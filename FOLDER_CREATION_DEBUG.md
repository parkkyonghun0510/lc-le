# Folder Creation Debugging Guide

## Issues Identified and Fixed

### 1. **Query Invalidation Problem**
**Issue**: The `useCreateFolder` hook was invalidating `folderKeys.lists()` but `useFolders` uses `folderKeys.list(params)` with specific parameters.

**Fix**: Changed invalidation to use `folderKeys.all` to invalidate all folder-related queries:
```typescript
// Before
queryClient.invalidateQueries({ queryKey: folderKeys.lists() });

// After  
queryClient.invalidateQueries({ queryKey: folderKeys.all });
```

### 2. **Stale Data Problem**
**Issue**: After creating a folder, the component was still using the old folders list.

**Fix**: Added explicit refetch after folder creation:
```typescript
const { data: foldersData, refetch: refetchFolders } = useFolders({ application_id: applicationId });

// In getOrCreateFolder function
await refetchFolders();
```

### 3. **Race Condition**
**Issue**: Trying to use the newly created folder immediately might cause race conditions.

**Fix**: Added a small delay to ensure backend processing:
```typescript
// Small delay to ensure backend processing
await new Promise(resolve => setTimeout(resolve, 500));
await refetchFolders();
```

## Debugging Steps Added

### 1. **Console Logging**
Added comprehensive logging to track the folder creation process:

```typescript
console.log(`Getting folder for document type: ${docType}, role: ${docDef.role}`);
console.log(`Using existing folder: ${folderName} (${existingFolder.id})`);
console.log(`Creating new folder: ${folderName} for application: ${applicationId}`);
console.log(`Created folder: ${folderName} (${newFolder.id})`);
console.log(`Uploading file with folderId: ${folderId}`);
console.log(`Upload successful, file folder_id: ${uploadedFile.folder_id}`);
```

### 2. **Enhanced Error Handling**
Added better error messages and user feedback:

```typescript
toast.success(`Created folder: ${folderName}`);
toast.error(`Failed to create folder: ${folderName}`);
toast.success(`${file.name} uploaded successfully to ${docDef.role} folder`);
```

## How to Test the Fix

### 1. **Open Browser Developer Tools**
- Open the Console tab to see debug messages
- Look for folder creation and upload logs

### 2. **Test Upload Process**
1. Go to new application page
2. Navigate to Document Attachment step
3. Select a document type (e.g., "រូបថតអ្នកខ្ចី")
4. Upload an image
5. Check console logs for:
   ```
   Getting folder for document type: borrower_photo, role: borrower
   Creating new folder: Borrower Documents for application: [app-id]
   Created folder: Borrower Documents ([folder-id])
   Uploading file with folderId: [folder-id]
   Upload successful, file folder_id: [folder-id]
   ```

### 3. **Verify Folder Creation**
1. Go to application detail page
2. Check if files appear under "ឯកសារ (តាមថត)" section
3. Verify files are organized by folder:
   - Borrower Documents
   - Guarantor Documents  
   - Collateral Documents

### 4. **Test Folder Reuse**
1. Upload another file of the same type
2. Check console logs should show:
   ```
   Using existing folder: Borrower Documents ([folder-id])
   ```
3. No new folder creation should occur

## Expected Folder Structure

After uploading different document types, you should see:

```
Application Files:
├── Borrower Documents/
│   ├── borrower_photo_001.jpg
│   ├── borrower_nid_front_001.jpg
│   ├── driver_license_001.jpg
│   └── passport_001.jpg
├── Guarantor Documents/
│   ├── guarantor_photo_001.jpg
│   └── guarantor_nid_front_001.jpg
└── Collateral Documents/
    ├── land_title_001.jpg
    ├── house_photo_001.jpg
    └── collateral_other_001.jpg
```

## Common Issues and Solutions

### Issue 1: Folders Not Created
**Symptoms**: Files still go to "Other Files" section
**Check**: 
- Console logs for folder creation attempts
- Network tab for API calls to `/folders/`
- Application ID is present

**Solution**: Ensure `applicationId` is available and valid

### Issue 2: Folders Created But Files Not Organized
**Symptoms**: Folders exist but files appear in "Other Files"
**Check**:
- Upload logs show correct `folderId`
- API response includes `folder_id` field

**Solution**: Verify backend properly associates files with folders

### Issue 3: Multiple Folders with Same Name
**Symptoms**: Duplicate folders created
**Check**:
- Folder existence check logic
- Query cache invalidation

**Solution**: Ensure proper folder reuse logic and cache refresh

## Backend Requirements

Ensure your backend supports:

1. **Folder Creation API**: `POST /folders/`
   ```json
   {
     "name": "Borrower Documents",
     "application_id": "app-123"
   }
   ```

2. **File Upload with Folder**: `POST /files/upload?folder_id=folder-123`

3. **File Response includes folder_id**:
   ```json
   {
     "id": "file-123",
     "folder_id": "folder-123",
     "original_filename": "photo.jpg"
   }
   ```

## Performance Considerations

### 1. **Caching Strategy**
- Folders are cached for 30 seconds
- Cache is invalidated after folder creation
- Explicit refetch ensures fresh data

### 2. **API Optimization**
- Folder existence check uses cached data
- Only creates folders when needed
- Reuses existing folders efficiently

### 3. **User Experience**
- Progress indicators during upload
- Success/error feedback
- Organized file display

## Monitoring and Maintenance

### 1. **Log Monitoring**
Monitor for:
- Folder creation failures
- Upload failures with folder assignment
- Cache invalidation issues

### 2. **Performance Metrics**
Track:
- Folder creation time
- Upload success rates
- Cache hit/miss ratios

### 3. **User Feedback**
Monitor for:
- Files appearing in wrong folders
- Missing folders in detail view
- Upload errors related to folder assignment

## Conclusion

The folder auto-creation system should now work correctly with:
- ✅ Automatic folder creation based on document type
- ✅ Proper folder reuse for subsequent uploads
- ✅ Organized display in application detail page
- ✅ Comprehensive error handling and user feedback
- ✅ Debug logging for troubleshooting

If issues persist, check the console logs and network requests to identify where the process is failing.