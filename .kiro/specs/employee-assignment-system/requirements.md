# Requirements Document

## Introduction

This feature introduces an **Employee Assignment System** that allows tagging and assigning employees to application forms independently from system users. Currently, the system uses `portfolio_officer_name` as a free-text field, which makes it difficult to track, report, and manage employee assignments. This feature will create a structured employee registry separate from system users, enabling better control and tracking of which employees work on applications without requiring them to have system login credentials.

The key distinction is:
- **System Users**: People who log into the system (officers, tellers, managers) with authentication
- **Employees**: People who work on applications but may not need system access (field officers, portfolio officers, etc.)

## Requirements

### Requirement 1: Employee Registry Management

**User Story:** As an administrator, I want to manage a registry of employees separate from system users, so that I can track all staff members who work on applications regardless of whether they have system access.

#### Acceptance Criteria

1. WHEN an administrator accesses the employee management section THEN the system SHALL display a list of all registered employees
2. WHEN an administrator creates a new employee record THEN the system SHALL require employee_code (unique), full_name_khmer, full_name_latin, and phone_number
3. WHEN an administrator creates a new employee record THEN the system SHALL optionally accept email, position, department_id, branch_id, and is_active status
4. WHEN an employee_code is entered THEN the system SHALL validate uniqueness and prevent duplicates
5. WHEN an administrator updates an employee record THEN the system SHALL maintain an audit trail of changes
6. WHEN an administrator deactivates an employee THEN the system SHALL set is_active to false without deleting the record
7. WHEN viewing employee list THEN the system SHALL support filtering by department, branch, position, and active status
8. WHEN viewing employee list THEN the system SHALL support search by name (Khmer or Latin) and employee code

### Requirement 2: Employee Assignment to Applications

**User Story:** As a user creating or editing an application, I want to tag/assign employees to the application form, so that I can track which employees are responsible for or working on this application.

#### Acceptance Criteria

1. WHEN a user creates or edits an application THEN the system SHALL provide an employee selection interface to assign employees
2. WHEN selecting employees THEN the system SHALL display a searchable dropdown or tag input showing employee names (Khmer and Latin) and employee codes
3. WHEN selecting employees THEN the system SHALL only show employees from the same branch as the application or the user's branch
4. WHEN an employee is assigned THEN the system SHALL store the employee_id reference in the application
5. WHEN multiple employees can be assigned THEN the system SHALL support assigning multiple employees with different roles (primary officer, secondary officer, field officer, etc.)
6. WHEN an employee is assigned THEN the system SHALL record the assignment timestamp and the user who made the assignment
7. WHEN viewing an application THEN the system SHALL display all assigned employees with their names, codes, and roles
8. WHEN an employee is deactivated THEN the system SHALL still display their historical assignments but prevent new assignments
9. WHEN attempting to assign an employee from a different branch THEN the system SHALL reject the assignment with an error message

### Requirement 3: Replace Free-Text Portfolio Officer Field

**User Story:** As a system administrator, I want to migrate from the free-text `portfolio_officer_name` field to structured employee assignments, so that we have consistent and reportable data.

#### Acceptance Criteria

1. WHEN the employee system is implemented THEN the system SHALL provide a migration path from `portfolio_officer_name` to employee assignments
2. WHEN displaying application forms THEN the system SHALL show assigned employees instead of the free-text portfolio officer name
3. WHEN editing existing applications THEN the system SHALL allow users to convert free-text names to employee assignments
4. WHEN backward compatibility is needed THEN the system SHALL maintain the `portfolio_officer_name` field for legacy data
5. IF an application has both old and new data THEN the system SHALL prioritize displaying employee assignments

### Requirement 4: Employee Assignment Reporting

**User Story:** As a manager, I want to view reports on employee assignments and workload, so that I can understand resource allocation and performance.

#### Acceptance Criteria

1. WHEN a manager accesses employee reports THEN the system SHALL display the number of applications assigned to each employee
2. WHEN viewing employee workload THEN the system SHALL show applications grouped by status (draft, pending, approved, rejected)
3. WHEN filtering reports THEN the system SHALL support filtering by date range, department, branch, and application status
4. WHEN viewing an employee's detail page THEN the system SHALL list all applications assigned to that employee
5. WHEN generating reports THEN the system SHALL include employee performance metrics (applications completed, average processing time)

### Requirement 5: Employee-User Linking (Optional)

**User Story:** As an administrator, I want to optionally link an employee record to a system user account, so that I can maintain a single source of truth for staff who have both roles.

#### Acceptance Criteria

1. WHEN creating or editing an employee THEN the system SHALL provide an optional field to link to a system user account
2. WHEN an employee is linked to a user THEN the system SHALL display this relationship in both employee and user profiles
3. WHEN a linked user logs in THEN the system SHALL automatically associate their actions with their employee record
4. WHEN unlinking an employee from a user THEN the system SHALL maintain historical assignment data
5. IF a user is deleted THEN the system SHALL preserve the employee record and unlink the relationship

### Requirement 6: API Support for Employee Management

**User Story:** As a mobile app developer, I want API endpoints for employee management, so that mobile applications can access and assign employees to applications.

#### Acceptance Criteria

1. WHEN the mobile app requests employee list THEN the API SHALL return active employees with their details
2. WHEN the mobile app searches for employees THEN the API SHALL support search by name and employee code
3. WHEN the mobile app assigns an employee to an application THEN the API SHALL validate the employee exists and is active
4. WHEN the mobile app retrieves an application THEN the API SHALL include assigned employee details in the response
5. WHEN the API returns employee data THEN the system SHALL include employee_id, employee_code, names, position, and department

### Requirement 7: Permission and Access Control

**User Story:** As a system administrator, I want to control who can manage employees and make assignments, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a user attempts to create/edit employees THEN the system SHALL verify they have 'manage_employees' permission
2. WHEN a user attempts to assign employees to applications THEN the system SHALL verify they have 'assign_employees' permission
3. WHEN a user views employee lists THEN the system SHALL allow read access based on 'view_employees' permission
4. WHEN a user views employee lists THEN the system SHALL filter employees to show only those in the user's branch (unless user is admin)
5. WHEN a user attempts to assign an employee THEN the system SHALL verify the employee belongs to the same branch as the application
6. WHEN permission is denied THEN the system SHALL return appropriate error messages
7. WHEN an admin configures permissions THEN the system SHALL support role-based assignment of employee management permissions
