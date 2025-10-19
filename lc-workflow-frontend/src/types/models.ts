// Core TypeScript interfaces matching the backend API structure

export interface BaseModel {
  id: string;
  created_at: string;
  updated_at: string;
}

// Position types (frontend DTOs aligned with backend /positions API)
export type PositionBase = { name: string; description?: string | null };
export type PositionCreate = PositionBase & { is_active?: boolean };
export type PositionUpdate = Partial<PositionCreate>;
export type Position = PositionBase & { id: string; is_active: boolean; created_at?: string; updated_at?: string };

export interface User extends BaseModel {
  is_active: boolean;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: 'admin' | 'manager' | 'officer';
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'archived';
  // Enhanced status management fields
  status_reason?: string;
  status_changed_at?: string;
  status_changed_by?: string;
  // Activity tracking fields
  last_activity_at?: string;
  login_count?: number;
  failed_login_attempts?: number;
  // Lifecycle management fields
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  department_id?: string;
  branch_id?: string;
  // Position relations
  position_id?: string | null;
  position?: Position | null;
  // Department and branch relations
  department?: Department | null;
  branch?: Branch | null;
  // Portfolio and line manager relations (now Employee objects, not User)
  portfolio_id?: string | null;
  line_manager_id?: string | null;
  portfolio?: EmployeeSummary | null;
  line_manager?: EmployeeSummary | null;
  profile_image_url?: string;
  last_login_at?: string;
  employee_id?: string;
}

export interface Department extends BaseModel {
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
  // Computed fields that may be included from backend
  user_count?: number;
  branch_count?: number;
  active_user_count?: number;
}

// Extended department interface with relationships
export interface DepartmentWithRelations extends Department {
  manager?: User;
  users?: User[];
  branches?: Branch[];
  user_count: number;
  branch_count: number;
  active_user_count: number;
}

export interface Branch extends BaseModel {
  name: string;
  code: string;
  address: string;
  phone_number?: string;
  email?: string;
  manager_id?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

// Employee Assignment System Types

export type AssignmentRole = 
  | 'primary_officer' 
  | 'secondary_officer' 
  | 'field_officer' 
  | 'reviewer' 
  | 'approver';

export interface Employee extends BaseModel {
  employee_code: string;
  full_name_khmer: string;
  full_name_latin: string;
  phone_number: string;
  email?: string;
  position?: string;
  department_id?: string;
  branch_id?: string;
  user_id?: string;
  is_active: boolean;
  notes?: string;
  // Optional relationship fields
  department?: Department;
  branch?: Branch;
  linked_user?: User;
  assignment_count?: number;
}

// Lightweight employee summary for relationships (matches backend EmployeeSummary)
export interface EmployeeSummary {
  id: string;
  employee_code: string;
  full_name_khmer: string;
  full_name_latin: string;
  position?: string;
  is_active: boolean;
}

export interface EmployeeAssignment extends BaseModel {
  application_id: string;
  employee_id: string;
  assignment_role: AssignmentRole;
  assigned_at: string;
  assigned_by?: string;
  is_active: boolean;
  notes?: string;
  // Relationship field
  employee?: Employee;
}

export type EmployeeCreate = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'department' | 'branch' | 'linked_user' | 'assignment_count'>;

export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'department' | 'branch' | 'linked_user' | 'assignment_count'>>;

export interface EmployeeAssignmentCreate {
  employee_id: string;
  assignment_role: AssignmentRole;
  notes?: string;
}

export interface EmployeeAssignmentUpdate {
  assignment_role?: AssignmentRole;
  is_active?: boolean;
  notes?: string;
}

// Employee Code Management Types

export interface NextCodeResponse {
  code: string;
  pattern: string;
}

export interface EmployeeBasicInfo {
  id: string;
  full_name_khmer: string;
  full_name_latin: string;
}

export interface CodeAvailabilityResponse {
  available: boolean;
  code: string;
  existing_employee?: EmployeeBasicInfo;
}

export interface GenerateCodesRequest {
  count: number;
  pattern?: string;
}

export interface GeneratedCodesResponse {
  codes: string[];
  count: number;
  expires_at?: string;
}

export interface CustomerApplication extends BaseModel {
  user_id: string;
  status: ApplicationStatus; // Legacy status field for compatibility
  workflow_status: WorkflowStatus; // New workflow status
  account_id?: string;

  // Borrower Information
  id_card_type?: string;
  id_number?: string;
  full_name_khmer?: string;
  full_name_latin?: string;
  phone?: string;
  date_of_birth?: string;
  current_address?: string;
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  sex?: string;
  marital_status?: string;
  portfolio_officer_name?: string;

  // Loan Details
  requested_amount?: number;
  loan_purposes?: string[];
  purpose_details?: string;
  product_type?: string;
  desired_loan_term?: number;
  requested_disbursement_date?: string;

  // Guarantor Information
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_id_number?: string;
  guarantor_address?: string;
  guarantor_relationship?: string;

  // Additional data
  collaterals?: Collateral[];
  documents?: ApplicationDocument[];

  // Legacy status tracking (kept for compatibility)
  submitted_at?: string;
  approved_at?: string;

  // Workflow Tracking fields
  workflow_stage?: string;
  assigned_reviewer?: string;
  priority_level?: string;
  po_created_at?: string;
  po_created_by?: string;
  user_completed_at?: string;
  user_completed_by?: string;
  teller_processed_at?: string;
  teller_processed_by?: string;
  manager_reviewed_at?: string;
  manager_reviewed_by?: string;
  
  // Account validation
  account_id_validated?: boolean;
  account_id_validation_notes?: string;

  // Financial Information
  monthly_expenses?: number;
  assets_value?: number;
  existing_loans?: any[];

  // Risk Assessment
  credit_score?: number;
  risk_category?: string;
  assessment_notes?: string;

  // Additional Loan Fields
  interest_rate?: number;
  loan_status?: string;
  loan_purpose?: string;
  loan_start_date?: string;
  loan_end_date?: string;

  // Legacy workflow tracking (kept for compatibility)
  teller_processing_at?: string;
  manager_review_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;

  // Employee Assignment System fields
  employee_assignments?: EmployeeAssignment[];
  portfolio_officer_migrated?: boolean;
}

export interface Collateral {
  type: string;
  description: string;
  estimated_value: number;
  documents?: string[];
}

export interface ApplicationDocument {
  type: string;
  name: string;
  file_id: string;
  upload_date: string;
}

export interface File extends BaseModel {
  filename: string;
  original_filename: string;
  display_name?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  application_id?: string;
  folder_id?: string;
  url?: string;
  preview_url?: string;
  expires_at?: string;
  metadata?: { [key: string]: any };
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role?: string;
  position_id?: string;
  department_id?: string;
  branch_id?: string;
  portfolio_id?: string;
  line_manager_id?: string;
  profile_image_url?: string;
  employee_id?: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  password?: string;
  role?: string;
  status?: string;
  status_reason?: string;
  is_active?: boolean;
  department_id?: string;
  position_id?: string;
  branch_id?: string;
  portfolio_id?: string;
  line_manager_id?: string;
  profile_image_url?: string;
  employee_id?: string;
}

// User status management types
export interface UserStatusChange {
  status: string;
  reason: string;
}

export interface UserStatusChangeResponse {
  user_id: string;
  old_status: string;
  new_status: string;
  reason: string;
  changed_by: string;
  changed_at: string;
  allowed_transitions: string[];
}

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'archived';

export interface DepartmentCreate {
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  is_active?: boolean;
}

export interface BranchCreate {
  name: string;
  code: string;
  address: string;
  phone_number?: string;
  email?: string;
  manager_id?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

export interface CustomerApplicationCreate {
  account_id?: string;
  id_card_type?: string;
  id_number?: string;
  full_name_khmer?: string;
  full_name_latin?: string;
  phone?: string;
  date_of_birth?: string;
  current_address?: string;
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  sex?: string;
  marital_status?: string;
  portfolio_officer_name?: string;
  requested_amount?: number;
  loan_purposes?: string[];
  purpose_details?: string;
  product_type?: string;
  desired_loan_term?: number;
  requested_disbursement_date?: string;
  interest_rate?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_id_number?: string;
  guarantor_address?: string;
  guarantor_relationship?: string;
  collaterals?: Collateral[];
  documents?: ApplicationDocument[];
  employee_assignments?: EmployeeAssignmentCreate[];
}

export interface CustomerApplicationUpdate extends Partial<CustomerApplicationCreate> {
  status?: ApplicationStatus; // Legacy status field
  workflow_status?: WorkflowStatus; // New workflow status
  desired_loan_term?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Legacy ApplicationStatus (kept for compatibility)
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

// New WorkflowStatus enum matching backend
export type WorkflowStatus =
  | 'PO_CREATED'
  | 'USER_COMPLETED'
  | 'TELLER_PROCESSING'
  | 'MANAGER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type UserRole = 'admin' | 'manager' | 'officer';


// Workflow-related interfaces
export interface WorkflowStatusInfo {
  current_status: WorkflowStatus;
  can_edit_form: boolean;
  next_stages: WorkflowStatus[];
  stage_description: string;
  permissions: {
    can_submit: boolean;
    can_process: boolean;
    can_review: boolean;
    can_approve: boolean;
    can_reject: boolean;
  };
}

export interface WorkflowHistoryEntry {
  status: WorkflowStatus;
  timestamp: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
}

export interface WorkflowTransitionRequest {
  new_status: WorkflowStatus;
  account_id?: string; // Required for teller processing
  notes?: string;
}

export interface ApprovalData {
  approved_amount: number;
  approved_term: number;
  interest_rate: number;
  notes?: string;
}