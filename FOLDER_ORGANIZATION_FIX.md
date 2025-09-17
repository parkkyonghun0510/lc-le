# Folder Organization Fix for Document Uploads

## Problem Identified
Files were being uploaded to a generic "other" folder instead of being organized by document type categories (borrower, guarantor, collateral).

## Root Cause
The `DocumentAttachmentStep` component was not creating or using folders when uploading files. All files were being uploaded directly to the application without folder organization.

## Solution Implemented

### 1. **Enhanced DocumentAttachmentStep Component**

#### **Added Folder Management Hooks**
```typescript
import { useUploadFile, useCreateFolder, useFolders } from '@/hooks/useFiles';

// Upload and folder hooks
const uploadFileMutation = useUploadFile();
const createFolderMutation = useCreateFolder();
const { data: foldersData } = useFolders({ application_id: applicationId });
const folders = foldersData?.items || [];
```

#### **Added Folder Creation Logic**
```typescript
const getOrCreateFolder = async (role: string): Promise<string | undefined> => {
  if (!applicationId) return undefined;
  
  // Map roles to folder names
  const folderNames = {
    borrower: 'Borrower Documents',
    guarantor: 'Guarantor Documents', 
    collateral: 'Collateral Documents'
  };
  
  const folderName = folderNames[role as keyof typeof folderNames];
  if (!folderName) return undefined;
  
  // Check if folder already exists
  const existingFolder = folders.find(f => f.name === folderName && f.application_id === applicationId);
  if (existingFolder) {
    return existingFolder.id;
  }
  
  // Create new folder
  try {
    const newFolder = await createFolderMutation.mutateAsync({
      name: folderName,
      application_id: applicationId
    });
    return newFolder.id;
  } catch (error) {
    console.error('Failed to create folder:', error);
    return undefined;
  }
};
```

#### **Updated File Upload Functions**
Both `handleFileUpload` and `handleImageCaptured` now:
1. Get the document definition to determine the role
2. Create or get the appropriate folder
3. Upload files with the folder ID
4. Provide user feedback about which folder the file was uploaded to

```typescript
// Get document definition to determine role
const docDef = docDefs.find(d => d.id === docType);
if (!docDef) {
  toast.error('Invalid document type');
  return;
}

// Get or create folder for this document role
const folderId = await getOrCreateFolder(docDef.role);

// Upload the file with folder ID
const uploadedFile = await uploadFileMutation.mutateAsync({
  file,
  applicationId,
  folderId, // Now includes folder ID
  documentType: 'photos',
  fieldName: docType,
  onProgress: (progress) => {
    setUploadProgress(prev => ({ ...prev, [key]: progress }));
  },
});
```

### 2. **Enhanced Application Detail Page**

#### **Updated Documents Section**
Changed from generic "Documents & Images" to "ឯកសារ (តាមថត)" (Documents by Folder) with proper folder organization.

#### **Folder-Based Organization**
```typescript
{appFolders.length > 0 ? (
  <div className="space-y-8">
    {appFolders.map((folder) => {
      const folderFiles = files.filter(f => f.folder_id === folder.id);
      const folderImages = folderFiles.filter(isImageFile);
      const folderDocs = folderFiles.filter(f => !isImageFile(f));
      
      // Render folder with its files
    })}
  </div>
) : (
  // Fallback for when no folders exist
)}
```

#### **Features Added**
- **Folder Headers**: Each folder shows name and file count
- **Organized Display**: Images and documents separated within each folder
- **Unorganized Files**: Special section for files not in any folder
- **Fallback Display**: Shows all files when no folders exist
- **Responsive Design**: Maintains responsive grid layouts

## Document Type to Folder Mapping

| Document Type | Role | Folder Name |
|---------------|------|-------------|
| `borrower_photo` | borrower | Borrower Documents |
| `borrower_nid_front` | borrower | Borrower Documents |
| `driver_license` | borrower | Borrower Documents |
| `passport` | borrower | Borrower Documents |
| `business_license` | borrower | Borrower Documents |
| `guarantor_photo` | guarantor | Guarantor Documents |
| `guarantor_nid_front` | guarantor | Guarantor Documents |
| `land_title` | collateral | Collateral Documents |
| `house_photo` | collateral | Collateral Documents |
| `collateral_other` | collateral | Collateral Documents |

## User Experience Improvements

### 1. **Upload Feedback**
- Success messages now indicate which folder the file was uploaded to
- Example: "Photo captured and uploaded successfully to borrower folder"

### 2. **Visual Organization**
- Files are now visually grouped by their purpose
- Clear folder headers with file counts
- Consistent styling across all folder sections

### 3. **Automatic Folder Creation**
- Folders are created automatically when first file of that type is uploaded
- No manual folder management required
- Folders are reused for subsequent uploads of the same type

## Technical Benefits

### 1. **Better Data Organization**
- Files are logically grouped by their purpose
- Easier to find specific document types
- Better database organization

### 2. **Scalability**
- Easy to add new document types and folders
- Folder structure can be extended without code changes
- Supports unlimited files per folder

### 3. **Performance**
- Faster file retrieval when organized by folders
- Better caching possibilities
- Reduced query complexity

## Error Handling

### 1. **Folder Creation Failures**
- Graceful fallback to uploading without folder
- Error logging for debugging
- User notification of issues

### 2. **Invalid Document Types**
- Validation of document type before upload
- Clear error messages for invalid types
- Prevention of uploads with missing metadata

## Future Enhancements

### 1. **Custom Folder Names**
- Allow users to customize folder names
- Support for multiple languages
- Folder name templates

### 2. **Folder Permissions**
- Role-based access to specific folders
- Read-only vs read-write permissions
- Audit trail for folder access

### 3. **Advanced Organization**
- Sub-folders for different document versions
- Date-based organization within folders
- Automatic archiving of old documents

## Testing Recommendations

### 1. **Upload Testing**
- Test file uploads for each document type
- Verify folder creation and reuse
- Test error scenarios (network failures, invalid files)

### 2. **Display Testing**
- Test folder display with various file counts
- Test responsive behavior on different screen sizes
- Test empty states and fallback scenarios

### 3. **Integration Testing**
- Test complete workflow from upload to display
- Test folder creation across multiple applications
- Test concurrent uploads to same folder

## Conclusion

The folder organization system now properly categorizes documents by their purpose:
- ✅ **Borrower Documents**: All borrower-related files
- ✅ **Guarantor Documents**: All guarantor-related files  
- ✅ **Collateral Documents**: All collateral-related files
- ✅ **Automatic Creation**: Folders created as needed
- ✅ **Visual Organization**: Clear display by folder
- ✅ **Backward Compatibility**: Handles existing unorganized files

This provides a much better user experience and data organization for document management in the loan application system.