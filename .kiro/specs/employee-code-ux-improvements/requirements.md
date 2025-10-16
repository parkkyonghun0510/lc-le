# Requirements Document

## Introduction

This feature enhances the **Employee Code Management** user experience by providing better handling of duplicate employee codes, auto-suggestion of available codes, and improved error messaging. Currently, when users attempt to create an employee with a duplicate code, they receive a generic error message without guidance on what code to use instead. This enhancement will make the employee creation process smoother and more user-friendly.

## Glossary

- **Employee Code**: A unique identifier assigned to each employee in the system (e.g., "0001", "EMP-2025-001")
- **Auto-suggestion**: System-generated recommendation for the next available employee code
- **Code Pattern**: The format or structure used for employee codes (e.g., sequential numbers, prefix-based)

## Requirements

### Requirement 1: Next Available Employee Code API

**User Story:** As a developer, I want an API endpoint that returns the next available employee code, so that the frontend can auto-suggest codes to users.

#### Acceptance Criteria

1. WHEN the API endpoint GET /api/v1/employees/next-code is called THEN the system SHALL return the next available sequential employee code
2. WHEN calculating the next code THEN the system SHALL analyze existing employee codes to determine the pattern
3. WHEN multiple code patterns exist THEN the system SHALL use the most common pattern
4. WHEN no employees exist THEN the system SHALL return a default starting code (e.g., "0001")
5. WHEN the endpoint accepts an optional pattern parameter THEN the system SHALL generate the next code following that specific pattern

### Requirement 2: Enhanced Duplicate Error Response

**User Story:** As a user creating an employee, I want helpful error messages when I enter a duplicate code, so that I know what code to use instead.

#### Acceptance Criteria

1. WHEN a duplicate employee code is submitted THEN the system SHALL return an error response with HTTP 409 status
2. WHEN returning a duplicate error THEN the system SHALL include the next available employee code in the response
3. WHEN returning a duplicate error THEN the system SHALL include a user-friendly message suggesting the available code
4. WHEN the duplicate error response is returned THEN the system SHALL include the existing employee's name who has that code
5. WHEN the API returns the error THEN the response SHALL follow the format: { "detail": "message", "suggested_code": "0002", "existing_employee": { "id": "uuid", "full_name_khmer": "name", "full_name_latin": "name" } }

### Requirement 3: Frontend Auto-fill Employee Code

**User Story:** As an administrator creating a new employee, I want the employee code field to be auto-filled with the next available code, so that I don't have to manually determine what code to use.

#### Acceptance Criteria

1. WHEN the employee creation modal opens THEN the system SHALL automatically fetch and populate the next available employee code
2. WHEN the auto-filled code is displayed THEN the system SHALL allow the user to edit or override it
3. WHEN the user clears the auto-filled code THEN the system SHALL provide a "Suggest Code" button to re-fetch a suggestion
4. WHEN the code field is empty and the user focuses on another field THEN the system SHALL display a validation message
5. WHEN the form is in edit mode THEN the system SHALL NOT auto-fill the employee code field

### Requirement 4: Enhanced Duplicate Error Handling in Frontend

**User Story:** As an administrator, I want clear feedback when I enter a duplicate employee code, so that I can quickly resolve the issue and continue creating the employee.

#### Acceptance Criteria

1. WHEN a duplicate code error is received from the API THEN the system SHALL display an inline error message below the employee code field
2. WHEN displaying the duplicate error THEN the system SHALL show the suggested available code
3. WHEN displaying the duplicate error THEN the system SHALL show which employee currently has that code
4. WHEN the suggested code is displayed THEN the system SHALL provide a "Use Suggested Code" button
5. WHEN the "Use Suggested Code" button is clicked THEN the system SHALL populate the employee code field with the suggested code
6. WHEN the duplicate error is shown THEN the system SHALL provide a link to view the existing employee's details

### Requirement 5: Employee Code Validation and Format

**User Story:** As a system administrator, I want to enforce employee code format rules, so that all employee codes follow a consistent pattern.

#### Acceptance Criteria

1. WHEN an employee code is entered THEN the system SHALL validate it matches the configured format pattern
2. WHEN the code format is invalid THEN the system SHALL display a validation error with the expected format
3. WHEN the system is configured with a code pattern THEN the system SHALL only accept codes matching that pattern
4. WHEN no pattern is configured THEN the system SHALL accept any alphanumeric code up to 20 characters
5. WHEN the pattern includes a prefix THEN the system SHALL automatically add the prefix to suggested codes

### Requirement 6: Bulk Employee Code Generation

**User Story:** As an administrator preparing to import multiple employees, I want to generate a batch of available employee codes, so that I can assign them during bulk import.

#### Acceptance Criteria

1. WHEN the API endpoint POST /api/v1/employees/generate-codes is called with a count parameter THEN the system SHALL return that many sequential available codes
2. WHEN generating bulk codes THEN the system SHALL ensure none of the generated codes conflict with existing codes
3. WHEN the count exceeds 100 THEN the system SHALL return an error message
4. WHEN generating codes THEN the system SHALL follow the configured code pattern
5. WHEN the generated codes are returned THEN the system SHALL reserve them for a configurable time period (e.g., 5 minutes)

### Requirement 7: Employee Code Search and Availability Check

**User Story:** As a user, I want to quickly check if an employee code is available before submitting the form, so that I can avoid submission errors.

#### Acceptance Criteria

1. WHEN the user types an employee code THEN the system SHALL debounce the input and check availability after 500ms
2. WHEN checking availability THEN the system SHALL call GET /api/v1/employees/check-code/{code} endpoint
3. WHEN the code is available THEN the system SHALL display a green checkmark indicator
4. WHEN the code is taken THEN the system SHALL display a red X indicator with the existing employee's name
5. WHEN the availability check is in progress THEN the system SHALL display a loading spinner
6. WHEN the check fails due to network error THEN the system SHALL not block form submission

