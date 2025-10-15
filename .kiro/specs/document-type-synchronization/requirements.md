# Requirements Document

## Introduction

The system currently has a critical mismatch between frontend and backend document type definitions, causing file upload failures. The Flutter app is trying to upload files with document type `business_registration`, but the backend is only accepting a limited set of legacy document types: `borrower_photo`, `borrower_id`, `guarantor_photo`, `guarantor_id`, `collateral_photo`, `collateral_document`, `land_title`, `contract`, and `other`. 

Meanwhile, the frontend defines a comprehensive set of 25+ document types including business documents, detailed borrower/guarantor documents, and various supporting documents. This mismatch creates a poor user experience and prevents users from uploading legitimate business documents that are essential for loan processing.

## Requirements

### Requirement 1

**User Story:** As a loan officer using the mobile app, I want to upload business registration documents without encountering validation errors, so that I can complete loan applications efficiently.

#### Acceptance Criteria

1. WHEN a user uploads a file with document_type 'business_registration' THEN the system SHALL accept the upload successfully
2. WHEN a user uploads any of the 25+ document types defined in the frontend (including business_license, borrower_id_card, guarantor_id_card, property_photos, etc.) THEN the backend SHALL recognize and process them without validation errors
3. WHEN the system validates document types THEN it SHALL use the comprehensive list from the parameter validation service, not the limited legacy list
4. WHEN a document type validation fails THEN the system SHALL provide clear error messages indicating the exact allowed values from the current comprehensive list

### Requirement 2

**User Story:** As a developer, I want document types to be synchronized between frontend and backend, so that I can maintain consistency and prevent validation mismatches.

#### Acceptance Criteria

1. WHEN document types are defined THEN they SHALL be maintained in a single source of truth
2. WHEN new document types are added THEN both frontend and backend SHALL automatically recognize them
3. WHEN document types are updated THEN the changes SHALL be reflected in both systems simultaneously
4. WHEN deploying updates THEN document type validation SHALL remain consistent across all environments

### Requirement 3

**User Story:** As a system administrator, I want to easily manage and update document types, so that I can adapt to changing business requirements without code changes.

#### Acceptance Criteria

1. WHEN document types need to be updated THEN the system SHALL provide a centralized configuration mechanism
2. WHEN document type changes are made THEN they SHALL be applied without requiring application restarts
3. WHEN document types are modified THEN the system SHALL validate the changes before applying them
4. WHEN document type configuration is invalid THEN the system SHALL provide clear error messages and fallback to previous valid configuration

### Requirement 4

**User Story:** As a quality assurance tester, I want to verify that document type validation works correctly, so that I can ensure the system handles all supported document types properly.

#### Acceptance Criteria

1. WHEN testing document uploads THEN the system SHALL accept all frontend-defined document types
2. WHEN testing with invalid document types THEN the system SHALL reject them with appropriate error messages
3. WHEN testing document type validation THEN the system SHALL provide consistent behavior across all endpoints
4. WHEN testing edge cases THEN the system SHALL handle null, empty, and malformed document types gracefully