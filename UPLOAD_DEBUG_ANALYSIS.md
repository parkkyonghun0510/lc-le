# Upload Debug Analysis

## Current Status

### ✅ What's Working:
1. **Folder Creation**: Successfully creating folders with correct names and IDs
2. **API Parameters**: Sending correct form data parameters to backend
3. **No 503 Errors**: Backend is now responding (no more Service Unavailable errors)

### ❌ Issues Identified:

#### 1. **Multiple Folder Creation**
**Problem**: Creating duplicate folders instead of reusing existing ones
```
Creating new folder: Borrower Documents for application: 9c480455-bea1-4474-8cd3-89321157065f
Created folder: Borrower Documents (b452f29e-3ed8-4270-a54e-e1234207509a)
Creating new folder: Borrower Documents for application: 9c480455-bea1-4474-8cd3-89321157065f  ← DUPLICATE!
Created folder: Borrower Documents (d5797a4f-6ee3-4c2d-bb2f-0069cce1df66)
```

**Root Cause**: Using stale folder cache instead of fresh data
**Fix Applied**: Always fetch fresh folder data before checking for existing folders

#### 2. **Files Not Visible**
**Problem**: Uploads appear successful but files don't show up in:
- MinIO storage
- Application preview/detail page

**Possible Causes**:
- Upload response doesn't match expected format
- Files uploaded to wrong location
- Query cache not invalidated properly
- Backend not actually storing files despite success response

## Fixes Applied

### 1. **Fixed Folder Reuse Logic**
```typescript
// OLD: Used stale cache
const existingFolder = folders.find(f => f.name === folderName && f.application_id === applicationId);

// NEW: Always fetch fresh data
const { data: currentFoldersData } = await refetchFolders();
const currentFolders = currentFoldersData?.items || [];
const existingFolder = currentFolders.find(f => f.name === folderName && f.application_id === applicationId);
```

### 2. **Enhanced Upload Logging**
Added detailed logging to track upload responses:
```typescript
console.log('Upload response:', uploadedFile);
console.log('File uploaded with folder_id:', uploadedFile.folder_id);
```

### 3. **Added File Fetching Debug**
Added logging to application detail page:
```typescript
console.log('Application files:', files.length, files);
console.log('Application folders:', appFolders.length, appFolders);
```

## Next Steps for Debugging

### 1. **Test Upload Again**
Upload a file and check console logs for:
```
Creating new folder: Borrower Documents for application: xxx
Created folder: Borrower Documents (folder-id-1)
Uploading to folder: folder-id-1
Form data parameters: {application_id: "xxx", folder_id: "folder-id-1", ...}
Upload response: {id: "file-id", folder_id: "folder-id-1", ...}  ← Check this!
File uploaded with folder_id: folder-id-1
```

### 2. **Check Application Detail Page**
Go to application detail page and check logs:
```
Application files: 1 [{id: "file-id", folder_id: "folder-id-1", ...}]
Application folders: 1 [{id: "folder-id-1", name: "Borrower Documents", ...}]
```

### 3. **Verify Backend Response**
Check Network tab in browser dev tools:
- Find the `/files/upload` request
- Check the response body
- Verify it includes correct `folder_id`
- Check if `id` field is present

### 4. **Check MinIO Directly**
If you have access to MinIO admin:
- Check if files are actually stored
- Verify the file paths
- Check if folders are created in storage

## Expected Behavior After Fixes

### **First Upload (New Folder)**:
```
Creating new folder: Borrower Documents for application: xxx
Created folder: Borrower Documents (folder-id-1)
Uploading to folder: folder-id-1
Upload response: {id: "file-id-1", folder_id: "folder-id-1", ...}
```

### **Second Upload (Reuse Folder)**:
```
Using existing folder: Borrower Documents (folder-id-1)  ← Should reuse!
Uploading to folder: folder-id-1
Upload response: {id: "file-id-2", folder_id: "folder-id-1", ...}
```

### **Application Detail Page**:
```
Application files: 2 [file-1, file-2]
Application folders: 1 [Borrower Documents]
Files should appear organized by folder in UI
```

## Potential Backend Issues

If files still don't appear after frontend fixes:

### 1. **Upload Endpoint Issues**
- Backend might not be processing `folder_id` parameter
- Files might be uploaded but not associated with folder
- Database transaction might be failing

### 2. **File Query Issues**
- Files might be stored but not returned by `/files/` endpoint
- Query might not include folder association
- Pagination might be hiding files

### 3. **MinIO Integration Issues**
- Files might not be actually stored in MinIO
- Storage path might be incorrect
- MinIO credentials/permissions issues

## Testing Checklist

- [ ] Upload file and check console logs
- [ ] Verify no duplicate folders created
- [ ] Check upload response includes correct `folder_id`
- [ ] Go to application detail page
- [ ] Verify files appear in organized folders
- [ ] Check MinIO storage (if accessible)
- [ ] Test with different document types
- [ ] Verify folder reuse works correctly

The folder creation issue should now be fixed. The file visibility issue will be clearer once we see the upload response logs.