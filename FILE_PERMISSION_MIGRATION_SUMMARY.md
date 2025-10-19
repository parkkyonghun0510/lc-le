# File Component Permission Migration Summary

## Task 11.4: Migrate file component role checks to permission checks

### Overview
Successfully migrated all file component role checks from `user?.role === 'admin'` to permission-based checks using the `usePermissionCheck` hook with `can(ResourceType.FILE, PermissionAction.DELETE)`.

### Files Updated

#### 1. **lc-workflow-frontend/app/files/page.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role check in delete button (line ~349)
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 2. **lc-workflow-frontend/src/components/files/MobileFileManager.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role check in delete button (line ~368)
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 3. **lc-workflow-frontend/src/components/files/FileManager.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role checks in 2 delete buttons (compact and full view)
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 4. **lc-workflow-frontend/src/components/files/FileExplorerView.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role checks in 2 delete buttons (list and grid view)
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 5. **lc-workflow-frontend/src/components/files/FolderFileExplorer.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role check in context menu delete button
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 6. **lc-workflow-frontend/src/components/files/CustomerFileExplorer.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role check in delete button
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

#### 7. **lc-workflow-frontend/src/components/files/AdvancedFileExplorer.tsx**
- Added imports: `usePermissionCheck`, `ResourceType`, `PermissionAction`
- Added `const { can } = usePermissionCheck();` hook
- Replaced role check in context menu delete button
- **Change**: `user?.role === 'admin'` → `can(ResourceType.FILE, PermissionAction.DELETE)`

### Permission Logic

The new permission check maintains the same behavior as before:
- Users with `FILE:DELETE` permission can delete any file
- Users can always delete their own files (checked via `file.uploaded_by === user?.id`)
- The permission check uses the backend RBAC system for authorization

**Before:**
```typescript
{(user?.role === 'admin' || file.uploaded_by === user?.id) && (
  <button onClick={() => handleDelete(file)}>Delete</button>
)}
```

**After:**
```typescript
{(can(ResourceType.FILE, PermissionAction.DELETE) || file.uploaded_by === user?.id) && (
  <button onClick={() => handleDelete(file)}>Delete</button>
)}
```

### Verification

✅ All 7 files successfully updated
✅ No TypeScript errors detected
✅ No remaining `user?.role === 'admin'` checks in file components
✅ All files use the `usePermissionCheck` hook correctly
✅ Permission checks follow the established pattern from other migrated components

### Benefits

1. **Centralized Permission Management**: File deletion permissions are now managed through the backend RBAC system
2. **Granular Control**: Administrators can grant/revoke file deletion permissions without code changes
3. **Consistency**: All components now use the same permission checking mechanism
4. **Maintainability**: Easier to update permission logic in one place (backend) rather than multiple components
5. **Audit Trail**: Permission changes are tracked through the backend audit system

### Testing Recommendations

To verify the migration works correctly:

1. **Admin User**: Should be able to delete any file (has FILE:DELETE permission)
2. **Regular User**: Should only be able to delete their own files
3. **User with FILE:DELETE Permission**: Should be able to delete any file
4. **User without FILE:DELETE Permission**: Should only see delete button for their own files
5. **Loading State**: Verify delete button doesn't flash during permission check loading

### Next Steps

According to the task list, the remaining migration tasks are:
- **Task 11.5**: Remove deprecated role-based infrastructure (useRole hook, role flags in AuthProvider)
- **Task 11.6**: Final cleanup and verification (search for remaining role checks, update documentation)
