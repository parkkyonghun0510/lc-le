# Requirements Document

## Introduction

This feature implements a comprehensive permission template system with real-world standard roles for a loan/credit workflow application. The system will provide pre-configured role templates based on industry best practices for microfinance institutions, making it easier to set up and debug the permission system by having realistic data in the database from the start.

The feature addresses the need for:
- Standard role definitions that match real-world organizational structures in microfinance
- Permission templates that can be quickly applied to new users
- Database seeding with realistic permission and role data for better debugging and testing
- Flexible template management for creating custom role configurations

## Requirements

### Requirement 1: Standard Role Templates

**User Story:** As a system administrator, I want pre-defined role templates based on real-world microfinance organizational structures, so that I can quickly set up appropriate access controls without having to manually configure each permission.

#### Acceptance Criteria

1. WHEN the system is initialized THEN it SHALL create the following standard roles with appropriate permission sets:
   - **Admin** (Level 100): Full system access, all permissions
   - **Branch Manager** (Level 80): Branch-level management, approve/reject applications, manage branch users, view branch analytics
   - **Credit Officer/Loan Officer** (Level 60): Create and manage applications, view own portfolio, assign employees to applications
   - **Teller** (Level 40): Process account IDs, validate customer information, view assigned applications
   - **Portfolio Officer** (Level 50): Manage customer portfolios, create applications on behalf of customers, view portfolio analytics
   - **Reviewer/Auditor** (Level 70): Read-only access to applications and audit trails, export reports
   - **Data Entry Clerk** (Level 30): Create draft applications, upload documents, basic data entry

2. WHEN a standard role is created THEN it SHALL include:
   - Role name, display name, and description
   - Appropriate permission level (hierarchy)
   - is_system_role flag set to true
   - Complete set of permissions matching the role's responsibilities
   - Scope restrictions (own, department, branch, global) appropriate to the role

3. WHEN standard roles are seeded THEN the system SHALL ensure idempotency by checking for existing roles before creation

### Requirement 2: Permission Template System

**User Story:** As a system administrator, I want to create and manage permission templates, so that I can quickly apply common permission sets to multiple users or create custom role configurations.

#### Acceptance Criteria

1. WHEN an administrator creates a permission template THEN the system SHALL:
   - Accept a template name, description, and template type
   - Accept a list of permission IDs to include in the template
   - Store default conditions that should be applied with the template
   - Mark the template as active by default

2. WHEN a permission template is applied to a user THEN the system SHALL:
   - Grant all permissions included in the template
   - Apply any default conditions specified in the template
   - Create appropriate UserPermission or UserRole records
   - Log the template application in the audit trail

3. WHEN an administrator views permission templates THEN the system SHALL display:
   - Template name, description, and type
   - Number of permissions included
   - Usage count (how many times the template has been applied)
   - Active/inactive status
   - Creation date and creator

4. WHEN an administrator updates a permission template THEN the system SHALL:
   - Allow modification of template name, description, and permissions
   - NOT automatically update users who already have the template applied
   - Increment the version or update timestamp
   - Prevent deletion of system templates (is_system_template=true)

### Requirement 3: Comprehensive Permission Seeding

**User Story:** As a developer, I want the database to be seeded with comprehensive, realistic permission and role data, so that I can test and debug the application with data that matches real-world usage patterns.

#### Acceptance Criteria

1. WHEN the permission seeding script is executed THEN it SHALL create:
   - All resource-type and action combinations that make sense for the application
   - Permissions for: USER, APPLICATION, DEPARTMENT, BRANCH, FILE, FOLDER, ANALYTICS, NOTIFICATION, AUDIT, SYSTEM resources
   - Actions including: CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, ASSIGN, EXPORT, MANAGE, VIEW_ALL
   - Appropriate scopes (OWN, DEPARTMENT, BRANCH, GLOBAL) for each permission

2. WHEN permissions are seeded THEN the system SHALL:
   - Create permissions with clear, descriptive names (e.g., "APPLICATION.APPROVE.DEPARTMENT")
   - Include detailed descriptions explaining what each permission allows
   - Mark system-critical permissions with is_system_permission=true
   - Set all permissions as active by default

3. WHEN roles are seeded THEN the system SHALL:
   - Create all standard roles defined in Requirement 1
   - Assign appropriate permissions to each role based on real-world responsibilities
   - Set correct hierarchy levels to establish role precedence
   - Create role relationships where applicable (e.g., Branch Manager inherits from Credit Officer)

4. WHEN the seeding script runs multiple times THEN it SHALL:
   - Check for existing permissions and roles before creating new ones
   - Update existing records if definitions have changed
   - NOT create duplicate records
   - Log all actions taken (created, updated, skipped)

### Requirement 4: Role-Based Permission Matrix

**User Story:** As a system administrator, I want to view a permission matrix showing which roles have which permissions, so that I can understand and verify the access control configuration.

#### Acceptance Criteria

1. WHEN an administrator requests the permission matrix THEN the system SHALL display:
   - A table with roles as rows and permissions as columns (or vice versa)
   - Visual indicators (checkmarks, colors) showing which permissions are granted to each role
   - Ability to filter by resource type, action, or scope
   - Ability to search for specific roles or permissions

2. WHEN viewing the permission matrix THEN the system SHALL show:
   - Role hierarchy levels
   - System roles vs. custom roles
   - Permission scopes for each role-permission combination
   - Inherited permissions (if role inheritance is implemented)

3. WHEN an administrator modifies permissions from the matrix THEN the system SHALL:
   - Allow toggling permissions on/off for roles
   - Require confirmation for changes to system roles
   - Update the RolePermission table accordingly
   - Log the change in the audit trail

### Requirement 5: Template-Based User Creation

**User Story:** As a system administrator, I want to create new users by applying a role template, so that new users are immediately set up with appropriate permissions without manual configuration.

#### Acceptance Criteria

1. WHEN creating a new user with a role template THEN the system SHALL:
   - Accept a template ID or role name during user creation
   - Automatically assign the role to the user
   - Create UserRole record with appropriate scope restrictions
   - Set effective_from to the current timestamp
   - Log the role assignment in the audit trail

2. WHEN a user is created with a department or branch assignment THEN the system SHALL:
   - Apply scope restrictions to the role assignment if the role supports it
   - Ensure the user can only access resources within their assigned scope
   - Validate that the department/branch exists before assignment

3. WHEN a user is created without specifying a role THEN the system SHALL:
   - Assign the default role (is_default=true) if one exists
   - Otherwise, create the user without any role
   - Log a warning if no default role is configured

### Requirement 6: Permission Template Export/Import

**User Story:** As a system administrator, I want to export and import permission templates, so that I can share configurations between environments or backup role configurations.

#### Acceptance Criteria

1. WHEN an administrator exports a permission template THEN the system SHALL:
   - Generate a JSON file containing the template definition
   - Include all permissions with their resource types, actions, and scopes
   - Include template metadata (name, description, type)
   - Exclude system-specific IDs (use names instead for portability)

2. WHEN an administrator imports a permission template THEN the system SHALL:
   - Parse the JSON file and validate the structure
   - Map permission names to existing permission IDs in the target system
   - Create the template if it doesn't exist
   - Update the template if it already exists (with confirmation)
   - Report any permissions that couldn't be mapped

3. WHEN importing templates THEN the system SHALL:
   - Validate that all referenced permissions exist in the target system
   - Provide a preview of what will be created/updated
   - Allow the administrator to confirm before applying changes
   - Log all import actions in the audit trail

### Requirement 7: Audit Trail for Permission Changes

**User Story:** As a compliance officer, I want to see a complete audit trail of all permission and role changes, so that I can track who made changes and when for compliance and security purposes.

#### Acceptance Criteria

1. WHEN any permission-related change occurs THEN the system SHALL log:
   - Action type (permission created, role assigned, template applied, etc.)
   - User who performed the action
   - Target user/role/permission affected
   - Timestamp of the change
   - IP address of the requester
   - Reason for change (if provided)
   - Before and after values for updates

2. WHEN viewing the audit trail THEN administrators SHALL be able to:
   - Filter by action type, user, date range, or target entity
   - Search for specific permission or role changes
   - Export audit logs to CSV or JSON
   - View detailed information about each audit entry

3. WHEN a permission template is applied THEN the audit trail SHALL record:
   - Template name and ID
   - User to whom the template was applied
   - All permissions granted as part of the template
   - Who applied the template
   - Timestamp of application

### Requirement 8: Validation and Error Handling

**User Story:** As a system administrator, I want clear error messages and validation when working with permissions and roles, so that I can quickly identify and fix configuration issues.

#### Acceptance Criteria

1. WHEN creating or updating a role THEN the system SHALL validate:
   - Role name is unique and follows naming conventions
   - Role level is within valid range (0-100)
   - Parent role exists if specified
   - No circular dependencies in role hierarchy
   - Required fields are provided

2. WHEN assigning permissions to a role THEN the system SHALL validate:
   - All permission IDs exist in the system
   - No duplicate permission assignments
   - Permissions are compatible with the role's scope restrictions

3. WHEN applying a template to a user THEN the system SHALL validate:
   - Template exists and is active
   - User exists and is active
   - User doesn't already have conflicting role assignments
   - All permissions in the template are valid

4. WHEN validation fails THEN the system SHALL:
   - Return a clear error message describing the issue
   - Include the field or entity that caused the validation failure
   - Suggest corrective actions where possible
   - NOT partially apply changes (all-or-nothing transactions)
