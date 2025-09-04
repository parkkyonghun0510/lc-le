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
  status: 'active' | 'inactive';
  department_id?: string;
  branch_id?: string;
  // Position relations
  position_id?: string | null;
  position?: Position | null;
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

export interface CustomerApplication extends BaseModel {
  user_id: string;
  status: ApplicationStatus;
  account_id?: string;

  // Borrower Information
  id_card_type?: string;
  id_number?: string;
  full_name_khmer?: string;
  full_name_latin?: string;
  phone?: string;
  date_of_birth?: string;
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

  // Additional data
  collaterals?: Collateral[];
  documents?: ApplicationDocument[];

  // Status tracking
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
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
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  application_id?: string;
  folder_id?: string;
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
  is_active?: boolean;
  department_id?: string;
  position_id?: string;
  branch_id?: string;
  profile_image_url?: string;
  employee_id?: string;
}

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
  portfolio_officer_name?: string;
  requested_amount?: number;
  loan_purposes?: string[];
  purpose_details?: string;
  product_type?: string;
  desired_loan_term?: number;
  loan_term_duration?: string;
  loan_term_frequency?: string;
  requested_disbursement_date?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  collaterals?: Collateral[];
  documents?: ApplicationDocument[];
}

export interface CustomerApplicationUpdate extends Partial<CustomerApplicationCreate> {
  status?: ApplicationStatus;
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

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type UserRole = 'admin' | 'manager' | 'officer';
export type UserStatus = 'active' | 'inactive';