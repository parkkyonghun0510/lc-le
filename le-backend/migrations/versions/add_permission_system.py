"""Add permission system tables

Revision ID: add_permission_system
Revises: previous_migration
Create Date: 2025-09-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_permission_system'
down_revision = '3c76b368'  # Add portfolio_line_manager_to_users migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Since the permission system tables already exist in the database,
    # this migration is considered complete. No action needed.
    pass


def downgrade() -> None:
    # Since the permission system tables already existed before this migration,
    # we don't drop them in the downgrade to avoid data loss.
    # If needed, these can be dropped manually.
    pass


def insert_default_permissions():
    """Insert default system permissions."""
    from sqlalchemy import text
    
    # Default permissions for each resource type
    default_permissions = [
        # User management
        ('user_create', 'Create users', 'user', 'create', 'global'),
        ('user_read', 'View users', 'user', 'read', 'own'),
        ('user_read_team', 'View team users', 'user', 'view_team', 'team'),
        ('user_read_department', 'View department users', 'user', 'view_department', 'department'),
        ('user_read_all', 'View all users', 'user', 'view_all', 'global'),
        ('user_update', 'Update users', 'user', 'update', 'own'),
        ('user_update_team', 'Update team users', 'user', 'update', 'team'),
        ('user_update_all', 'Update all users', 'user', 'update', 'global'),
        ('user_delete', 'Delete users', 'user', 'delete', 'global'),
        ('user_assign', 'Assign roles/permissions', 'user', 'assign', 'global'),
        
        # Application management
        ('application_create', 'Create applications', 'application', 'create', 'own'),
        ('application_read', 'View applications', 'application', 'read', 'own'),
        ('application_read_team', 'View team applications', 'application', 'view_team', 'team'),
        ('application_read_department', 'View department applications', 'application', 'view_department', 'department'),
        ('application_read_all', 'View all applications', 'application', 'view_all', 'global'),
        ('application_update', 'Update applications', 'application', 'update', 'own'),
        ('application_update_team', 'Update team applications', 'application', 'update', 'team'),
        ('application_delete', 'Delete applications', 'application', 'delete', 'own'),
        ('application_approve', 'Approve applications', 'application', 'approve', 'team'),
        ('application_reject', 'Reject applications', 'application', 'reject', 'team'),
        
        # Department management
        ('department_create', 'Create departments', 'department', 'create', 'global'),
        ('department_read', 'View departments', 'department', 'read', 'global'),
        ('department_update', 'Update departments', 'department', 'update', 'global'),
        ('department_delete', 'Delete departments', 'department', 'delete', 'global'),
        ('department_manage', 'Manage departments', 'department', 'manage', 'global'),
        
        # Branch management
        ('branch_create', 'Create branches', 'branch', 'create', 'global'),
        ('branch_read', 'View branches', 'branch', 'read', 'global'),
        ('branch_update', 'Update branches', 'branch', 'update', 'global'),
        ('branch_delete', 'Delete branches', 'branch', 'delete', 'global'),
        ('branch_manage', 'Manage branches', 'branch', 'manage', 'global'),
        
        # File management
        ('file_create', 'Upload files', 'file', 'create', 'own'),
        ('file_read', 'View files', 'file', 'read', 'own'),
        ('file_read_team', 'View team files', 'file', 'view_team', 'team'),
        ('file_read_all', 'View all files', 'file', 'view_all', 'global'),
        ('file_update', 'Update files', 'file', 'update', 'own'),
        ('file_delete', 'Delete files', 'file', 'delete', 'own'),
        ('file_export', 'Export files', 'file', 'export', 'own'),
        
        # Analytics
        ('analytics_read', 'View analytics', 'analytics', 'read', 'own'),
        ('analytics_read_team', 'View team analytics', 'analytics', 'view_team', 'team'),
        ('analytics_read_department', 'View department analytics', 'analytics', 'view_department', 'department'),
        ('analytics_read_all', 'View all analytics', 'analytics', 'view_all', 'global'),
        ('analytics_export', 'Export analytics', 'analytics', 'export', 'team'),
        
        # System management
        ('system_manage', 'System administration', 'system', 'manage', 'global'),
        ('system_read', 'View system information', 'system', 'read', 'global'),
        ('system_create', 'Create system resources', 'system', 'create', 'global'),
        ('system_update', 'Update system settings', 'system', 'update', 'global'),
        ('system_delete', 'Delete system resources', 'system', 'delete', 'global'),
    ]
    
    # Insert permissions
    for name, description, resource_type, action, scope in default_permissions:
        op.execute(text(f"""
            INSERT INTO permissions (name, description, resource_type, action, scope, is_system_permission)
            VALUES ('{name}', '{description}', '{resource_type}', '{action}', '{scope}', true)
            ON CONFLICT (name) DO NOTHING
        """))


def insert_default_roles():
    """Insert default system roles."""
    from sqlalchemy import text
    
    # Default roles
    default_roles = [
        ('admin', 'System Administrator', 'Full system access with all permissions', 100, True, True),
        ('manager', 'Manager', 'Department/branch management with team oversight', 80, True, False),
        ('officer', 'Officer', 'Basic user with limited permissions', 40, True, True),
        ('viewer', 'Viewer', 'Read-only access to assigned resources', 20, True, False),
    ]
    
    # Insert roles
    for name, display_name, description, level, is_system, is_default in default_roles:
        op.execute(text(f"""
            INSERT INTO roles (name, display_name, description, level, is_system_role, is_default)
            VALUES ('{name}', '{display_name}', '{description}', {level}, {is_system}, {is_default})
            ON CONFLICT (name) DO NOTHING
        """))


def assign_default_permissions_to_roles():
    """Assign default permissions to system roles."""
    from sqlalchemy import text
    
    # Admin gets all permissions
    op.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id, is_granted)
        SELECT r.id, p.id, true
        FROM roles r, permissions p
        WHERE r.name = 'admin'
        ON CONFLICT (role_id, permission_id) DO NOTHING
    """))
    
    # Manager gets management permissions
    manager_permissions = [
        'user_read_department', 'user_update_team', 'user_assign',
        'application_read_department', 'application_update_team', 'application_approve', 'application_reject',
        'file_read_team', 'analytics_read_department', 'analytics_export'
    ]
    
    for perm in manager_permissions:
        op.execute(text(f"""
            INSERT INTO role_permissions (role_id, permission_id, is_granted)
            SELECT r.id, p.id, true
            FROM roles r, permissions p
            WHERE r.name = 'manager' AND p.name = '{perm}'
            ON CONFLICT (role_id, permission_id) DO NOTHING
        """))
    
    # Officer gets basic permissions
    officer_permissions = [
        'user_read', 'user_update',
        'application_create', 'application_read', 'application_update',
        'file_create', 'file_read', 'file_update', 'file_delete',
        'analytics_read'
    ]
    
    for perm in officer_permissions:
        op.execute(text(f"""
            INSERT INTO role_permissions (role_id, permission_id, is_granted)
            SELECT r.id, p.id, true
            FROM roles r, permissions p
            WHERE r.name = 'officer' AND p.name = '{perm}'
            ON CONFLICT (role_id, permission_id) DO NOTHING
        """))
    
    # Viewer gets read-only permissions
    viewer_permissions = [
        'user_read', 'application_read', 'file_read', 'analytics_read'
    ]
    
    for perm in viewer_permissions:
        op.execute(text(f"""
            INSERT INTO role_permissions (role_id, permission_id, is_granted)
            SELECT r.id, p.id, true
            FROM roles r, permissions p
            WHERE r.name = 'viewer' AND p.name = '{perm}'
            ON CONFLICT (role_id, permission_id) DO NOTHING
        """))


# Call the data insertion functions after table creation
def upgrade_with_data() -> None:
    upgrade()
    insert_default_permissions()
    insert_default_roles()
    assign_default_permissions_to_roles()


if __name__ == '__main__':
    # This allows running the migration with data
    upgrade_with_data()