/**
 * Permission Management System - Type Definitions
 * 
 * Comprehensive TypeScript types for the RBAC permission management system.
 * These types match the backend API structure and provide type safety throughout the application.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Resource types that can have permissions applied
 */
export enum ResourceType {
  USER = 'user',
  APPLICATION = 'application',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  FILE = 'file',
  FOLDER = 'folder',
  ANALYTICS = 'analytics',
  NOTIFICATION = 'notification',
  AUDIT = 'audit',
  SYSTEM = 'system',
  POSITION = 'position',
  EMPLOYEE = 'employee',
  ROLE = 'role',
  PERMISSION = 'permission',
}

/**
 * Actions that can be performed on resources
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage',
  VIEW_ALL = 'view_all',
  VIEW_OWN = 'view_own',
  VIEW_TEAM = 'view_team',
  VIEW_DEPARTMENT = 'view_department',
  VIEW_BRANCH = 'view_branch',
}

/**
 * Scope of permission application
 */
export enum PermissionScope {
  GLOBAL = 'global',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  TEAM = 'team',
  OWN = 'own',
}

// ============================================================================
// Core Permission Types
// ============================================================================

/**
 * Base permission entity
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: Record<string, any>;
  is_active: boolean;
  is_system_permission: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Permission creation request
 */
export interface CreatePermissionRequest {
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Permission update request
 */
export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
  resource_type?: ResourceType;
  action?: PermissionAction;
  scope?: PermissionScope;
  conditions?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Permission list filters
 */
export interface PermissionFilters {
  resource_type?: ResourceType;
  action?: PermissionAction;
  scope?: PermissionScope;
  is_active?: boolean;
  search?: string;
}

/**
 * Permission list parameters
 */
export interface ListPermissionsParams extends PermissionFilters {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Permission list response
 */
export interface ListPermissionsResponse {
  items: Permission[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role entity
 */
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  parent_role_id?: string;
  is_system_role: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  member_count?: number;
  permission_count?: number;
}

/**
 * Role creation request
 */
export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description: string;
  level?: number;
  parent_role_id?: string;
  is_active?: boolean;
  is_default?: boolean;
  permission_ids?: string[];
}

/**
 * Role update request
 */
export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  level?: number;
  parent_role_id?: string;
  is_active?: boolean;
  is_default?: boolean;
  permission_ids?: string[];
}

/**
 * Role list filters
 */
export interface RoleFilters {
  is_active?: boolean;
  is_system_role?: boolean;
  search?: string;
  min_member_count?: number;
  max_member_count?: number;
}

/**
 * Role list parameters
 */
export interface ListRolesParams extends RoleFilters {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Role list response
 */
export interface ListRolesResponse {
  items: Role[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================================
// User Permission Types
// ============================================================================

/**
 * User role assignment
 */
export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: string;
  role?: Role;
}

/**
 * User role assignment creation
 */
export interface RoleAssignmentCreate {
  role_id: string;
  assigned_by?: string;
}

/**
 * Direct user permission
 */
export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  is_granted: boolean;
  granted_by?: string;
  granted_at: string;
  permission?: Permission;
}

/**
 * User permission creation
 */
export interface UserPermissionCreate {
  permission_id: string;
  is_granted: boolean;
  granted_by?: string;
}

/**
 * Effective permission with source
 */
export interface EffectivePermission {
  permission: Permission;
  source: 'role' | 'direct';
  role_name?: string;
  role_id?: string;
  is_granted: boolean;
}

/**
 * User permissions response
 */
export interface UserPermissionsResponse {
  user_id: string;
  roles: Role[];
  direct_permissions: UserPermission[];
  effective_permissions: EffectivePermission[];
}

// ============================================================================
// Permission Matrix Types
// ============================================================================

/**
 * Matrix cell data
 */
export interface MatrixCell {
  user_id: string;
  permission_id: string;
  is_granted: boolean;
  source: 'role' | 'direct' | 'none';
  role_name?: string;
}

/**
 * Matrix filters
 */
export interface MatrixFilters {
  department_id?: string;
  branch_id?: string;
  resource_type?: ResourceType;
  scope?: PermissionScope;
  user_search?: string;
  permission_search?: string;
}

/**
 * Permission matrix role (for role-based matrix view)
 */
export interface PermissionMatrixRole {
  id: string;
  name: string;
  display_name: string;
  level: number;
  permission_ids: string[];
}

/**
 * Permission matrix permission (for matrix view)
 */
export interface PermissionMatrixPermission {
  id: string;
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  category?: string;
}

/**
 * Permission matrix response (user-based)
 */
export interface PermissionMatrixResponse {
  users: Array<{
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id?: string;
    branch_id?: string;
  }>;
  permissions: Permission[];
  matrix: Record<string, Record<string, MatrixCell>>;
}

/**
 * Role-based permission matrix response
 */
export interface RolePermissionMatrixResponse {
  roles: PermissionMatrixRole[];
  permissions: PermissionMatrixPermission[];
  assignments: Record<string, string[]>; // role_id -> permission_ids[]
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

/**
 * Bulk action types
 */
export type BulkAction = 'activate' | 'deactivate' | 'delete';

/**
 * Bulk operation request
 */
export interface BulkOperationRequest {
  action: BulkAction;
  ids: string[];
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  total: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Bulk role assignment
 */
export interface BulkRoleAssignment {
  user_ids: string[];
  role_id: string;
  assigned_by?: string;
}

// ============================================================================
// Permission Template Types
// ============================================================================

/**
 * Permission template entity
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  category?: string;
  is_system_template: boolean;
  is_active: boolean;
  permission_ids: string[];
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  usage_count?: number;
}

/**
 * Template creation request
 */
export interface CreateTemplateRequest {
  name: string;
  description: string;
  template_type: string;
  category?: string;
  permission_ids: string[];
  is_active?: boolean;
}

/**
 * Template update request
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  template_type?: string;
  category?: string;
  permission_ids?: string[];
  is_active?: boolean;
}

/**
 * Template generation from roles request
 */
export interface TemplateGenerationRequest {
  name: string;
  description: string;
  template_type: string;
  category?: string;
  source_role_ids: string[];
  merge_strategy?: 'union' | 'intersection';
}

/**
 * Template application request
 */
export interface TemplateApplicationRequest {
  template_id: string;
  target_type: 'role' | 'user';
  target_id: string;
  merge_strategy?: 'replace' | 'merge';
}

/**
 * Template list filters
 */
export interface TemplateFilters {
  template_type?: string;
  category?: string;
  is_active?: boolean;
  search?: string;
}

/**
 * Template list parameters
 */
export interface ListTemplatesParams extends TemplateFilters {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Template list response
 */
export interface ListTemplatesResponse {
  items: PermissionTemplate[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Template comparison result
 */
export interface TemplateComparison {
  template1: PermissionTemplate;
  template2: PermissionTemplate;
  common_permissions: Permission[];
  unique_to_template1: Permission[];
  unique_to_template2: Permission[];
  similarity_percentage: number;
}

// ============================================================================
// Permission Check Types
// ============================================================================

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  resource_type: ResourceType;
  action: PermissionAction;
  scope?: PermissionScope;
  resource_id?: string;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;
  matched_permissions?: Permission[];
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Permission form data (for react-hook-form)
 */
export interface PermissionFormData {
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: string; // JSON string for form input
  is_active: boolean;
}

/**
 * Role form data (for react-hook-form)
 */
export interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  level: number;
  parent_role_id?: string;
  is_active: boolean;
  is_default: boolean;
  permission_ids: string[];
}

// ============================================================================
// Draft Types (for localStorage persistence)
// ============================================================================

/**
 * Form draft metadata
 */
export interface FormDraft<T> {
  data: T;
  timestamp: string;
  form_type: 'permission' | 'role';
}

// ============================================================================
// Audit Trail Types
// ============================================================================

/**
 * Audit action types
 */
export type AuditActionType =
  | 'permission_created'
  | 'permission_updated'
  | 'permission_deleted'
  | 'permission_toggled'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'role_assigned'
  | 'role_revoked'
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_permission_assigned'
  | 'role_permission_revoked';

/**
 * Audit entity types
 */
export type AuditEntityType = 'permission' | 'role' | 'user_permission' | 'user_role' | 'role_permission';

/**
 * Permission change audit entry
 */
export interface PermissionAuditEntry {
  id: number;
  action: AuditActionType;
  entity_type: AuditEntityType;
  entity_id?: string;
  user_id?: string;
  user_name?: string;
  target_user_id?: string;
  target_user_name?: string;
  target_role_id?: string;
  target_role_name?: string;
  permission_id?: string;
  permission_name?: string;
  role_id?: string;
  role_name?: string;
  details?: Record<string, any>;
  reason?: string;
  timestamp: string;
  ip_address?: string;
}

/**
 * Audit trail filters
 */
export interface AuditTrailFilters {
  action_type?: AuditActionType;
  entity_type?: AuditEntityType;
  user_id?: string;
  target_user_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

/**
 * Audit trail list parameters
 */
export interface AuditTrailParams extends AuditTrailFilters {
  page?: number;
  size?: number;
}

/**
 * Audit trail list response
 */
export interface AuditTrailResponse {
  items: PermissionAuditEntry[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Permission API error response
 */
export interface PermissionApiError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Paginated list parameters (generic)
 */
export interface PaginationParams {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response (generic)
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
