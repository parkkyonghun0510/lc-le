# Folder Organization System

## Overview

The Folder Organization System provides automatic document organization based on document types for loan applications. This system ensures that uploaded documents are automatically placed in appropriate folders, making it easier for loan officers to find and review specific document types.

## Features

- **Automatic Folder Creation**: Folders are created automatically based on document types
- **Document Type Mapping**: Each document type is mapped to a specific folder category
- **Folder Reuse Logic**: Prevents duplicate folder creation by reusing existing folders
- **Backward Compatibility**: Maintains compatibility with existing folder structure
- **Folder Hierarchy Management**: Provides complete folder hierarchy with file counts

## Document Types and Folder Mapping

### Borrower Documents
All borrower-related documents are organized under "Borrower Documents" folder:
- `borrower_photo` - Borrower profile photo
- `borrower_id_card` - Borrower ID card/passport
- `borrower_family_book` - Borrower family book
- `borrower_income_proof` - Borrower income proof documents
- `borrower_bank_statement` - Borrower bank statements

### Guarantor Documents
All guarantor-related documents are organized under "Guarantor Documents" folder:
- `guarantor_photo` - Guarantor profile photo
- `guarantor_id_card` - Guarantor ID card/passport
- `guarantor_family_book` - Guarantor family book
- `guarantor_income_proof` - Guarantor income proof documents
- `guarantor_bank_statement` - Guarantor bank statements

### Collateral Documents
All collateral-related documents are organized under "Collateral Documents" folder:
- `land_title` - Land title documents
- `property_valuation` - Property valuation reports
- `property_photos` - Property photos
- `vehicle_registration` - Vehicle registration documents
- `vehicle_photos` - Vehicle photos

### Business Documents
All business-related documents are organized under "Business Documents" folder:
- `business_license` - Business license
- `business_registration` - Business registration documents
- `business_financial_statement` - Business financial statements

### Supporting Documents
All supporting documents are organized under "Supporting Documents" folder:
- `loan_application_form` - Loan application form
- `credit_report` - Credit reports
- `reference_letter` - Reference letters
- `other_supporting_doc` - Other supporting documents

## API Usage

### File Upload with Document Type

When uploading a file, specify the `document_type` parameter to automatically organize the file:

```bash
curl -X POST "http://localhost:8000/api/v1/files/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "application_id=APPLICATION_UUID" \
  -F "document_type=borrower_photo"
```

The system will automatically:
1. Create the appropriate folder structure if it doesn't exist
2. Place the file in the correct folder based on document type
3. Return the file information with the assigned folder ID

### Get Available Document Types

```bash
curl -X GET "http://localhost:8000/api/v1/folders/document-types" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "borrower": [
    "borrower_photo",
    "borrower_id_card",
    "borrower_family_book",
    "borrower_income_proof",
    "borrower_bank_statement"
  ],
  "guarantor": [
    "guarantor_photo",
    "guarantor_id_card",
    "guarantor_family_book",
    "guarantor_income_proof",
    "guarantor_bank_statement"
  ],
  "collateral": [
    "land_title",
    "property_valuation",
    "property_photos",
    "vehicle_registration",
    "vehicle_photos"
  ],
  "business": [
    "business_license",
    "business_registration",
    "business_financial_statement"
  ],
  "supporting": [
    "loan_application_form",
    "credit_report",
    "reference_letter",
    "other_supporting_doc"
  ]
}
```

### Get Document Type to Folder Mapping

```bash
curl -X GET "http://localhost:8000/api/v1/folders/document-type-mapping" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Application Folder Hierarchy

```bash
curl -X GET "http://localhost:8000/api/v1/folders/application/APPLICATION_UUID/hierarchy" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "application_id": "APPLICATION_UUID",
  "folders": [
    {
      "id": "PARENT_FOLDER_UUID",
      "name": "Application APPLICATION_UUID Files",
      "file_count": 10,
      "children": [
        {
          "id": "BORROWER_FOLDER_UUID",
          "name": "Borrower Documents",
          "file_count": 3
        },
        {
          "id": "GUARANTOR_FOLDER_UUID",
          "name": "Guarantor Documents",
          "file_count": 2
        },
        {
          "id": "COLLATERAL_FOLDER_UUID",
          "name": "Collateral Documents",
          "file_count": 5
        }
      ]
    }
  ],
  "total_files": 10
}
```

### Create Folder for Document Type

```bash
curl -X POST "http://localhost:8000/api/v1/folders/application/APPLICATION_UUID/folder-for-document-type" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_type": "borrower_photo"}'
```

## Backend Implementation

### Service Layer

The folder organization is implemented in `app/services/folder_service.py`:

- `EnhancedFolderService`: Main service class for folder operations
- `FolderOrganizationConfig`: Configuration class for document type mappings
- `DocumentType`: Enum defining all supported document types

### Key Functions

- `get_folder_for_document_type()`: Get or create folder for a specific document type
- `get_application_folder_hierarchy()`: Get complete folder hierarchy for an application
- `get_or_create_application_folder_structure()`: Legacy function with enhanced capabilities

### Router Endpoints

The folder management endpoints are implemented in `app/routers/folders.py`:

- `GET /document-types`: Get available document types
- `GET /document-type-mapping`: Get document type to folder mapping
- `GET /application/{id}/hierarchy`: Get folder hierarchy for application
- `POST /application/{id}/folder-for-document-type`: Create folder for document type

## Backward Compatibility

The system maintains backward compatibility with the existing folder structure:

### Legacy Folder Mapping
- `photos` → `Borrower Documents`
- `references` → `Supporting Documents`
- `supporting_docs` → `Supporting Documents`

### Migration Strategy
Existing applications will continue to work with the legacy folder names, while new uploads can use the enhanced document type system.

## Error Handling

The system includes comprehensive error handling:

- **Invalid Document Type**: Returns appropriate error message for unsupported document types
- **Permission Checks**: Ensures users can only access folders for their applications
- **Duplicate Folder Consolidation**: Automatically handles and consolidates duplicate folders
- **Graceful Fallbacks**: Falls back to parent folder if document type folder creation fails

## Testing

The system includes comprehensive tests:

- **Unit Tests**: Test document type validation and folder mapping logic
- **Integration Tests**: Test integration with file upload system
- **API Tests**: Test folder management endpoints

Run tests:
```bash
# Unit tests for document type mapping
python -m pytest tests/test_folder_organization.py::TestDocumentTypeMapping -v

# Integration tests
python -m pytest tests/test_folder_integration.py -v
```

## Configuration

### Adding New Document Types

To add new document types:

1. Add the document type to the `DocumentType` enum in `folder_service.py`
2. Add the mapping to `DOCUMENT_TYPE_TO_FOLDER` in `FolderOrganizationConfig`
3. Update the folder router to include the new type in the response
4. Add tests for the new document type

### Customizing Folder Names

Folder names can be customized by modifying the `DOCUMENT_TYPE_TO_FOLDER` mapping in `FolderOrganizationConfig`.

## Performance Considerations

- **Folder Caching**: Folder lookups are optimized to minimize database queries
- **Batch Operations**: Multiple files of the same type reuse existing folders
- **Duplicate Prevention**: Built-in logic prevents duplicate folder creation
- **Efficient Queries**: Uses optimized database queries with proper indexing

## Security

- **Access Control**: Users can only access folders for applications they own or have permission to view
- **Input Validation**: All document types are validated against the allowed enum values
- **SQL Injection Prevention**: Uses parameterized queries and ORM for all database operations

## Monitoring and Logging

The system includes comprehensive logging:

- **Folder Creation**: Logs when new folders are created
- **Document Type Processing**: Logs document type validation and folder assignment
- **Error Tracking**: Logs errors with correlation IDs for debugging
- **Performance Metrics**: Tracks folder operation performance

## Future Enhancements

Potential future enhancements:

1. **Custom Folder Templates**: Allow customization of folder structure per loan product
2. **Automated Document Classification**: Use AI to automatically classify document types
3. **Folder Permissions**: Implement granular permissions for different folder types
4. **Document Workflows**: Integrate with document approval workflows
5. **Audit Trail**: Track all folder and document operations for compliance