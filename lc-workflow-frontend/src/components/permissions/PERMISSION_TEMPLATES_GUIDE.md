# Permission Templates Component Guide

## Overview

The Permission Templates component provides a comprehensive interface for managing reusable permission sets. Templates allow administrators to quickly configure roles and users with pre-defined permission configurations, ensuring consistency and reducing manual configuration time.

## Features

### 1. Template Library
- **Browse Templates**: View all available permission templates with categories and descriptions
- **Search & Filter**: Find templates by name, description, or category
- **Template Cards**: Visual cards showing template details, usage statistics, and quick actions

### 2. Template Creation
- **Manual Creation**: Create custom templates with specific permissions
- **Form Validation**: Ensures all required fields are properly filled
- **Template Types**: Categorize templates (Management, Operational, Administrative, Technical, Custom)

### 3. Template Preview
- **Detailed View**: See all template metadata and permissions
- **Usage Statistics**: Track how many times a template has been applied
- **Permission Breakdown**: View all permissions included in the template

### 4. Template Editing
- **Modify Details**: Update template name, description, and type
- **Permission Management**: Add or remove permissions from the template
- **Active Status**: Enable or disable templates
- **System Protection**: System templates cannot be edited or deleted

### 5. Template Deletion
- **Confirmation Dialog**: Prevents accidental deletion
- **Usage Warning**: Shows warning if template has been used
- **System Protection**: System templates cannot be deleted

### 6. Template Comparison
- **Side-by-Side View**: Compare two templates to see differences
- **Permission Diff**: Shows common, unique, and different permissions
- **Statistics**: Visual breakdown of permission overlap

### 7. Template Application
- **Role Application**: Apply templates to one or multiple roles
- **User Application**: Apply templates directly to users
- **Bulk Mode**: Select and apply to multiple targets at once
- **Independent Copies**: Each application creates an independent permission set
- **Version Independence**: Future template changes don't affect previous applications

## Usage Examples

### Creating a New Template

1. Click the "Create Template" button
2. Fill in the template details:
   - **Name**: Descriptive name (e.g., "Branch Manager Template")
   - **Description**: What the template is for and when to use it
   - **Template Type**: Select appropriate category
3. Click "Create Template"
4. Edit the template to add permissions

### Applying a Template to Roles

1. Find the template you want to apply
2. Click the "Apply" button on the template card
3. Select "Apply to Roles"
4. Enable "bulk mode" if applying to multiple roles
5. Search and select the target role(s)
6. Click "Apply to X role(s)"

### Applying a Template to Users

1. Find the template you want to apply
2. Click the "Apply" button
3. Select "Apply to Users"
4. Search for users by name or email
5. Select the target user(s)
6. Click "Apply to X user(s)"

### Comparing Templates

1. Click the "Compare" button on a template card
2. Search for another template to compare
3. Select the comparison template
4. Review the differences:
   - **Common Permissions**: Permissions in both templates
   - **Unique to First**: Permissions only in the first template
   - **Unique to Second**: Permissions only in the second template

### Editing a Template

1. Click the "Edit" button on a template card
2. Modify the template details as needed
3. Click "Manage Permissions" to add/remove permissions
4. Check/uncheck permissions in the list
5. Click "Save Changes"

### Deleting a Template

1. Click the delete (trash) icon on a template card
2. Review the confirmation dialog
3. Note any usage warnings
4. Click "Delete Template" to confirm

## Important Notes

### Template Independence

When you apply a template to a role or user, it creates an **independent copy** of the permissions. This means:

- Future changes to the template **will not** affect previously configured roles/users
- Each application is a snapshot of the template at that moment
- You can safely modify templates without worrying about breaking existing configurations

### System Templates

System templates are protected and cannot be:
- Edited
- Deleted
- Deactivated

They serve as baseline configurations and should be used as-is or as a reference for creating custom templates.

### Bulk Application

When using bulk mode:
- You can select multiple roles or users
- The template will be applied to all selected targets
- Each target receives an independent copy of the permissions
- Failed applications won't affect successful ones

### Template Versioning

While the current implementation doesn't track template versions explicitly, the system maintains:
- Creation and update timestamps
- Usage count tracking
- Independent permission copies for each application

This ensures that you can track when templates were created/modified and how often they've been used.

## Best Practices

### 1. Template Naming
- Use descriptive names that clearly indicate the template's purpose
- Include the role level or department if applicable
- Example: "Senior Branch Manager - Full Access"

### 2. Template Descriptions
- Explain what the template is for
- Mention when it should be used
- List any special considerations
- Example: "For branch managers with full operational authority. Includes all branch-level permissions plus reporting access."

### 3. Template Organization
- Use appropriate template types for categorization
- Create templates for common role configurations
- Avoid creating too many similar templates

### 4. Template Maintenance
- Regularly review template usage statistics
- Archive or delete unused templates
- Update templates when permission requirements change
- Document major changes in the description

### 5. Permission Selection
- Include only necessary permissions
- Follow the principle of least privilege
- Group related permissions together
- Test templates before widespread use

## API Integration

The component integrates with the following backend endpoints:

- `GET /api/v1/permissions/templates` - List all templates
- `POST /api/v1/permissions/templates` - Create new template
- `PUT /api/v1/permissions/templates/{id}` - Update template
- `DELETE /api/v1/permissions/templates/{id}` - Delete template
- `POST /api/v1/permissions/templates/{id}/apply/{type}/{target_id}` - Apply template

## Component Props

```typescript
interface PermissionTemplatesProps {
  onGenerateClick: () => void;  // Callback for "Generate Templates" button
}
```

## State Management

The component uses React Query for:
- Fetching templates
- Creating/updating/deleting templates
- Applying templates to roles/users
- Automatic cache invalidation
- Optimistic updates

## Accessibility

The component follows WCAG 2.1 AA guidelines:
- Keyboard navigation support
- Screen reader friendly
- Proper ARIA labels
- Focus management in modals
- Color contrast compliance

## Performance

The component is optimized for:
- Large template lists (virtualization ready)
- Efficient search and filtering
- Lazy loading of modals
- Debounced search inputs
- Minimal re-renders

## Troubleshooting

### Template Not Appearing
- Check if the template is active
- Verify search/filter settings
- Refresh the page to reload data

### Cannot Edit Template
- System templates cannot be edited
- Check if you have the required permissions
- Verify the template is not locked

### Application Failed
- Verify the target role/user exists
- Check if you have permission to modify the target
- Review error messages in the console

### Comparison Not Working
- Ensure both templates have permissions configured
- Try refreshing the template list
- Check browser console for errors

## Future Enhancements

Potential improvements for future versions:
- Template versioning with rollback
- Template import/export
- Template cloning
- Permission conflict detection
- Template recommendations based on role patterns
- Audit trail for template changes
- Template approval workflow
