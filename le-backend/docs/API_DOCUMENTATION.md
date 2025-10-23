# LC Workflow System - Complete API Documentation

## Overview
This documentation covers the complete API for the LC Workflow System, including both frontend proxy endpoints and backend direct endpoints. The system provides comprehensive loan application management with user authentication, file handling, and permission-based access control.

## Base URLs

### Backend Direct Access
```
http://localhost:8000/api/v1
```

### Frontend Proxy Access
```
http://localhost:3000/api/v1
```
Frontend proxy routes provide additional security and CORS handling for client-side requests.

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Authentication Flow
1. **Login**: `POST /auth/login` with username/password
2. **Receive tokens**: Access token (30 minutes) and refresh token (24 hours)
3. **Use access token**: Include in Authorization header for all requests
4. **Refresh token**: `POST /auth/refresh` when access token expires
5. **Logout**: `POST /auth/logout` to invalidate tokens

---

## API Architecture

### Frontend Proxy Endpoints
The frontend provides proxy routes for enhanced security and CORS handling. These routes are accessible at `/api/v1/*` on the frontend server and automatically proxy requests to the backend.

**Key Features:**
- Automatic token management from localStorage
- Enhanced error handling and user-friendly messages
- CORS handling for browser requests
- Request/response transformation
- Retry logic with exponential backoff

### Backend Direct Endpoints
Direct backend endpoints provide full API functionality without frontend proxying. These are used for:
- Server-to-server communication
- Direct API access
- Administrative operations
- Third-party integrations

---

## Frontend Proxy Endpoints

### User Management (Proxy)

#### Get User by ID
**Frontend Route:** `GET /api/v1/users/{user_id}`
**Backend Proxy:** `GET /api/v1/users/{user_id}`

**Description:** Retrieve specific user details through frontend proxy.

**Response:** User object with full details.

#### Update User
**Frontend Route:** `PATCH /api/v1/users/{user_id}`
**Backend Proxy:** `PATCH /api/v1/users/{user_id}`

**Description:** Update user information through frontend proxy.

**Request:**
```json
{
   "first_name": "Updated First Name",
   "last_name": "Updated Last Name",
   "email": "updated@example.com"
}
```

#### User Profile Photo Management

##### Upload Profile Photo
**Frontend Route:** `POST /api/v1/users/{user_id}/profile-photo`
**Backend Proxy:** `POST /api/v1/users/{user_id}/profile-photo`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Image file (PNG, JPG, JPEG)
- `optimize`: Boolean (default: true)

##### Get Profile Photo URLs
**Frontend Route:** `GET /api/v1/users/{user_id}/profile-photo-urls`
**Backend Proxy:** `GET /api/v1/users/{user_id}/profile-photo-urls`

**Response:**
```json
{
  "original": "https://minio.example.com/photos/user-123/original.jpg",
  "thumbnail": "https://minio.example.com/photos/user-123/thumb.jpg",
  "optimized": "https://minio.example.com/photos/user-123/optimized.jpg"
}
```

##### Delete Profile Photo
**Frontend Route:** `DELETE /api/v1/users/{user_id}/profile-photo`
**Backend Proxy:** `DELETE /api/v1/users/{user_id}/profile-photo`

#### User Lifecycle Management

##### Start Onboarding
**Frontend Route:** `POST /api/v1/users/{user_id}/lifecycle/onboarding`
**Backend Proxy:** `POST /api/v1/users/{user_id}/lifecycle/onboarding`

##### Complete Onboarding
**Frontend Route:** `PATCH /api/v1/users/{user_id}/lifecycle/onboarding`
**Backend Proxy:** `PATCH /api/v1/users/{user_id}/lifecycle/onboarding`

**Request:**
```json
{
  "completed_at": "2024-01-15T10:30:00Z",
  "notes": "Successfully completed onboarding"
}
```

#### User Import/Export

##### Import Users from CSV
**Frontend Route:** `POST /api/v1/users/import/csv`
**Backend Proxy:** `POST /api/v1/users/import/csv`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV file with user data

##### Export Users to CSV
**Frontend Route:** `GET /api/v1/users/export/csv`
**Backend Proxy:** `GET /api/v1/users/export/csv`

**Query Parameters:**
- `department_id`: Filter by department
- `branch_id`: Filter by branch
- `role`: Filter by role
- `is_active`: Filter by active status

##### Download CSV Template
**Frontend Route:** `GET /api/v1/users/export/csv/template`
**Backend Proxy:** `GET /api/v1/users/export/csv/template`

### Dashboard (Proxy)

#### Recent Applications
**Frontend Route:** `GET /api/dashboard/recent-applications`
**Backend Proxy:** `GET /api/v1/dashboard/recent-applications`

**Query Parameters:**
- `limit`: Number of applications (default: 10)
- `today_only`: Show only today's applications (default: true)

---

## Backend Direct Endpoints

## Authentication Endpoints

### Setup Check
Check if initial setup is required.

**Endpoint:** `GET /auth/setup-required`

**Response:**
```json
{
  "setup_required": false,
  "message": "System is already configured"
}
```

### User Login
Authenticate user and receive access tokens.

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "username": "john.doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   "token_type": "bearer",
   "expires_in": 1800,
   "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "john.doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin",
      "department": {
         "id": "dept-123",
         "name": "Credit Department"
      },
      "branch": {
         "id": "branch-456",
         "name": "Main Branch"
      }
   }
}
```

### Token Refresh
Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

## User Management

### Get All Users
Retrieve paginated list of users with filtering.

**Endpoint:** `GET /users`

**Query Parameters:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)
- `role` (string, optional)
- `department_id` (uuid, optional)
- `branch_id` (uuid, optional)
- `search` (string, optional)

**Response:**
```json
{
   "items": [
      {
         "id": "123e4567-e89b-12d3-a456-426614174000",
         "username": "john.doe",
         "email": "john@example.com",
         "first_name": "John",
         "last_name": "Doe",
         "role": "admin",
         "department": {
            "id": "dept-123",
            "name": "Credit Department"
         },
         "branch": {
            "id": "branch-456",
            "name": "Main Branch"
         },
         "position": {
            "id": "pos-789",
            "name": "Senior Manager"
         },
         "is_active": true,
         "last_login_at": "2024-01-15T10:30:00Z",
         "created_at": "2024-01-01T00:00:00Z"
      }
   ],
   "total": 150,
   "page": 1,
   "size": 20,
   "pages": 8
}
```

### Create User
Create a new user account.

**Endpoint:** `POST /users`

**Request:**
```json
{
   "username": "jane.smith",
   "email": "jane@example.com",
   "first_name": "Jane",
   "last_name": "Smith",
   "password": "securepassword123",
   "role": "reviewer",
   "department_id": "dept-123",
   "branch_id": "branch-456",
   "position_id": "pos-789",
   "phone_number": "+1234567890"
}
```

**Response:**
```json
{
   "id": "987e6543-e21b-43d2-b654-987654321000",
   "username": "jane.smith",
   "email": "jane@example.com",
   "first_name": "Jane",
   "last_name": "Smith",
   "role": "reviewer",
   "department": {
      "id": "dept-123",
      "name": "Credit Department"
   },
   "branch": {
      "id": "branch-456",
      "name": "Main Branch"
   },
   "position": {
      "id": "pos-789",
      "name": "Senior Manager"
   },
   "is_active": true,
   "created_at": "2024-01-15T10:30:00Z"
}
```

### Get User by ID
Retrieve specific user details.

**Endpoint:** `GET /users/{user_id}`

**Response:**
```json
{
   "id": "123e4567-e89b-12d3-a456-426614174000",
   "username": "john.doe",
   "email": "john@example.com",
   "first_name": "John",
   "last_name": "Doe",
   "role": "admin",
   "department": {
      "id": "dept-123",
      "name": "Credit Department"
   },
   "branch": {
      "id": "branch-456",
      "name": "Main Branch"
   },
   "position": {
      "id": "pos-789",
      "name": "Senior Manager"
   },
   "phone_number": "+1234567890",
   "is_active": true,
   "last_login_at": "2024-01-15T10:30:00Z",
   "created_at": "2024-01-01T00:00:00Z",
   "updated_at": "2024-01-15T10:30:00Z"
}
```

### Update User
Update user information.

**Endpoint:** `PATCH /users/{user_id}`

**Request:**
```json
{
   "first_name": "John Updated",
   "last_name": "Doe",
   "email": "john.updated@example.com",
   "department_id": "dept-456",
   "role": "manager"
}
```

**Response:**
Same as Get User by ID with updated fields.

### Delete User
Soft delete or deactivate a user.

**Endpoint:** `DELETE /users/{user_id}`

**Response:**
```json
{
  "message": "User successfully deleted"
}
```

---

## Customer Applications

### Get All Applications
Retrieve paginated list of applications with filtering.

**Endpoint:** `GET /applications`

**Query Parameters:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)
- `status` (string, optional: draft, submitted, under_review, approved, rejected)
- `branch_id` (uuid, optional)
- `user_id` (uuid, optional)
- `date_from` (date, optional)
- `date_to` (date, optional)
- `search` (string, optional)

**Response:**
```json
{
  "items": [
    {
      "id": "app-123e4567-e89b-12d3-a456-426614174000",
      "account_id": "123456789",
      "id_card_type": "national_id",
      "id_number": "1234567890123",
      "full_name_khmer": "អាលីស ចនសុន",
      "full_name_latin": "Alice Johnson",
      "phone": "+1234567890",
      "date_of_birth": "1985-03-15",
      "sex": "female",
      "marital_status": "married",
      "current_address": "123 Main St, New York, NY 10001",
      "province": "New York",
      "district": "Manhattan",
      "commune": "Midtown",
      "village": "Times Square",
      "occupation": "Software Engineer",
      "employer_name": "Tech Corp",
      "monthly_income": 8000,
      "income_source": "salary",
      "requested_amount": 350000,
      "loan_purposes": ["home_purchase"],
      "purpose_details": "Primary residence purchase",
      "product_type": "conventional",
      "desired_loan_term": "360_months",
      "requested_disbursement_date": "2024-02-01",
      "interest_rate": 3.5,
      "loan_amount": 350000,
      "loan_status": "submitted",
      "loan_purpose": "home_purchase",
      "loan_start_date": null,
      "loan_end_date": null,
      "guarantor_name": "Bob Johnson",
      "guarantor_phone": "+1234567891",
      "guarantor_id_number": "1234567890124",
      "guarantor_address": "123 Main St, New York, NY 10001",
      "guarantor_relationship": "spouse",
      "monthly_expenses": 4000,
      "assets_value": 50000,
      "existing_loans": [],
      "credit_score": 750,
      "risk_category": "low",
      "assessment_notes": "Excellent credit history",
      "collaterals": [],
      "documents": [],
      "profile_image": null,
      "borrower_nid_photo_path": null,
      "borrower_home_or_land_photo_path": null,
      "borrower_business_photo_path": null,
      "guarantor_nid_photo_path": null,
      "guarantor_home_or_land_photo_path": null,
      "guarantor_business_photo_path": null,
      "profile_photo_path": null,
      "workflow_stage": "credit_check",
      "assigned_reviewer": "user-123",
      "priority_level": "normal",
      "workflow_status": "USER_COMPLETED",
      "po_created_at": "2024-01-10T08:00:00Z",
      "po_created_by": "user-po-123",
      "user_completed_at": "2024-01-15T10:30:00Z",
      "user_completed_by": "user-456",
      "teller_processed_at": null,
      "teller_processed_by": null,
      "manager_reviewed_at": null,
      "manager_reviewed_by": null,
      "account_id_validated": true,
      "account_id_validation_notes": null,
      "status": "submitted",
      "user_id": "user-456",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "submitted_at": "2024-01-15T10:30:00Z",
      "approved_at": null,
      "approved_by": null,
      "rejected_at": null,
      "rejected_by": null,
      "rejection_reason": null,
      "employee_assignments": [],
      "portfolio_officer_migrated": true
    }
  ],
  "total": 45,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

### Create Application
Create a new customer application.

**Endpoint:** `POST /applications`

**Request:**
```json
{
  "account_id": "123456789",
  "id_card_type": "national_id",
  "id_number": "1234567890123",
  "full_name_khmer": "អាលីស ចនសុន",
  "full_name_latin": "Alice Johnson",
  "phone": "+1234567890",
  "date_of_birth": "1985-03-15",
  "sex": "female",
  "marital_status": "married",
  "current_address": "123 Main St, New York, NY 10001",
  "province": "New York",
  "district": "Manhattan",
  "commune": "Midtown",
  "village": "Times Square",
  "occupation": "Software Engineer",
  "employer_name": "Tech Corp",
  "monthly_income": 8000,
  "income_source": "salary",
  "requested_amount": 350000,
  "loan_purposes": ["home_purchase"],
  "purpose_details": "Primary residence purchase",
  "product_type": "conventional",
  "desired_loan_term": "360_months",
  "requested_disbursement_date": "2024-02-01",
  "interest_rate": 3.5,
  "guarantor_name": "Bob Johnson",
  "guarantor_phone": "+1234567891",
  "guarantor_id_number": "1234567890124",
  "guarantor_address": "123 Main St, New York, NY 10001",
  "guarantor_relationship": "spouse",
  "monthly_expenses": 4000,
  "assets_value": 50000,
  "existing_loans": [],
  "credit_score": 750,
  "risk_category": "low",
  "assessment_notes": "Excellent credit history",
  "collaterals": [],
  "documents": [],
  "employee_assignments": []
}
```

**Response:**
```json
{
  "id": "app-123e4567-e89b-12d3-a456-426614174000",
  "account_id": "123456789",
  "id_card_type": "national_id",
  "id_number": "1234567890123",
  "full_name_khmer": "អាលីស ចនសុន",
  "full_name_latin": "Alice Johnson",
  "phone": "+1234567890",
  "date_of_birth": "1985-03-15",
  "sex": "female",
  "marital_status": "married",
  "current_address": "123 Main St, New York, NY 10001",
  "province": "New York",
  "district": "Manhattan",
  "commune": "Midtown",
  "village": "Times Square",
  "occupation": "Software Engineer",
  "employer_name": "Tech Corp",
  "monthly_income": 8000,
  "income_source": "salary",
  "requested_amount": 350000,
  "loan_purposes": ["home_purchase"],
  "purpose_details": "Primary residence purchase",
  "product_type": "conventional",
  "desired_loan_term": "360_months",
  "requested_disbursement_date": "2024-02-01",
  "interest_rate": 3.5,
  "guarantor_name": "Bob Johnson",
  "guarantor_phone": "+1234567891",
  "guarantor_id_number": "1234567890124",
  "guarantor_address": "123 Main St, New York, NY 10001",
  "guarantor_relationship": "spouse",
  "monthly_expenses": 4000,
  "assets_value": 50000,
  "existing_loans": [],
  "credit_score": 750,
  "risk_category": "low",
  "assessment_notes": "Excellent credit history",
  "collaterals": [],
  "documents": [],
  "profile_image": null,
  "borrower_nid_photo_path": null,
  "borrower_home_or_land_photo_path": null,
  "borrower_business_photo_path": null,
  "guarantor_nid_photo_path": null,
  "guarantor_home_or_land_photo_path": null,
  "guarantor_business_photo_path": null,
  "profile_photo_path": null,
  "workflow_stage": "initial",
  "assigned_reviewer": null,
  "priority_level": "normal",
  "workflow_status": "PO_CREATED",
  "po_created_at": "2024-01-15T10:30:00Z",
  "po_created_by": "user-123",
  "user_completed_at": null,
  "user_completed_by": null,
  "teller_processed_at": null,
  "teller_processed_by": null,
  "manager_reviewed_at": null,
  "manager_reviewed_by": null,
  "account_id_validated": false,
  "account_id_validation_notes": null,
  "status": "draft",
  "user_id": "user-123",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "submitted_at": null,
  "approved_at": null,
  "approved_by": null,
  "rejected_at": null,
  "rejected_by": null,
  "rejection_reason": null,
  "employee_assignments": [],
  "portfolio_officer_migrated": false
}
```

### Get Application by ID
Retrieve specific application details.

**Endpoint:** `GET /applications/{application_id}`

**Response:**
Full application object including all nested data.

### Update Application
Update application information.

**Endpoint:** `PATCH /applications/{application_id}`

**Request:**
```json
{
  "phone": "+1234567899",
  "requested_amount": 375000
}
```

**Response:**
Updated application object.

### Submit Application
Submit application for review.

**Endpoint:** `POST /applications/{application_id}/submit`

**Response:**
```json
{
  "message": "Application submitted successfully",
  "status": "submitted",
  "submitted_at": "2024-01-15T10:30:00Z"
}
```

### Assign Reviewer
Assign application to a reviewer.

**Endpoint:** `POST /applications/{application_id}/assign-reviewer`

**Request:**
```json
{
  "reviewer_id": "user-123"
}
```

**Response:**
```json
{
   "message": "Reviewer assigned successfully",
   "assigned_reviewer": {
      "id": "user-123",
      "first_name": "John",
      "last_name": "Reviewer"
   }
}
```

### Update Application Status
Change application status.

**Endpoint:** `PATCH /applications/{application_id}/status`

**Request:**
```json
{
  "status": "approved",
  "notes": "Application approved based on excellent credit score and stable employment"
}
```

**Response:**
```json
{
  "message": "Status updated successfully",
  "status": "approved",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Delete Application
Delete an application and all associated data.

**Endpoint:** `DELETE /applications/{application_id}`

**Response:**
```json
{
  "message": "Application and all associated data deleted successfully"
}
```

---

## File Management

### Upload File
Upload a file directly to the server.

**Endpoint:** `POST /files/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file): The file to upload
- `application_id` (string, optional): Associated application ID
- `folder_id` (string, optional): Folder to organize files
- `description` (string, optional): File description

**Response:**
```json
{
  "id": "file-123e4567-e89b-12d3-a456-426614174000",
  "filename": "income_proof.pdf",
  "original_filename": "income_proof_2024.pdf",
  "path": "applications/app-123/income_proof.pdf",
  "size": 1048576,
  "content_type": "application/pdf",
  "application": {
    "id": "app-123",
    "borrower_name": "Alice Johnson"
  },
  "uploaded_by": {
    "id": "user-123",
    "first_name": "John",
    "last_name": "Doe"
  },
  "upload_url": "https://minio.example.com/lc-workflow-files/applications/app-123/income_proof.pdf",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Get Upload URL
Generate a presigned URL for direct client upload.

**Endpoint:** `POST /files/upload-url`

**Request:**
```json
{
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "application_id": "app-123",
  "folder_id": "folder-456"
}
```

**Response:**
```json
{
  "upload_url": "https://minio.example.com/lc-workflow-files/applications/app-123/uuid-document.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "object_name": "applications/app-123/uuid-document.pdf",
  "expires_in": 3600,
  "fields": {
    "key": "applications/app-123/uuid-document.pdf",
    "Content-Type": "application/pdf",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "...",
    "X-Amz-Date": "20240115T103000Z",
    "Policy": "...",
    "X-Amz-Signature": "..."
  }
}
```

### Finalize Upload
Register a file that was uploaded using presigned URL.

**Endpoint:** `POST /files/finalize`

**Request:**
```json
{
  "object_name": "applications/app-123/uuid-document.pdf",
  "filename": "document.pdf",
  "application_id": "app-123",
  "folder_id": "folder-456"
}
```

**Response:**
Same as Upload File response.

### Get Files
Retrieve files with filtering and pagination.

**Endpoint:** `GET /files`

**Query Parameters:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)
- `application_id` (uuid, optional)
- `user_id` (uuid, optional)
- `content_type` (string, optional)
- `date_from` (date, optional)
- `date_to` (date, optional)

**Response:**
```json
{
  "items": [
    {
      "id": "file-123e4567-e89b-12d3-a456-426614174000",
      "filename": "income_proof.pdf",
      "original_filename": "income_proof_2024.pdf",
      "path": "applications/app-123/income_proof.pdf",
      "size": 1048576,
      "content_type": "application/pdf",
      "application": {
        "id": "app-123",
        "borrower_name": "Alice Johnson"
      },
      "uploaded_by": {
        "id": "user-123",
        "first_name": "John",
        "last_name": "Doe"
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "size": 20,
  "pages": 2
}
```

### Get File by ID
Retrieve specific file details.

**Endpoint:** `GET /files/{file_id}`

**Response:**
Single file object with full details.

### Download File
Get download URL for a file.

**Endpoint:** `GET /files/{file_id}/download`

**Query Parameters:**
- `expires` (int, default: 3600): URL expiration time in seconds

**Response:**
```json
{
  "download_url": "https://minio.example.com/lc-workflow-files/applications/app-123/income_proof.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "expires_in": 3600
}
```

### Delete File
Delete a file from storage.

**Endpoint:** `DELETE /files/{file_id}`

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

---

## Departments

### Get All Departments
List all departments.

**Endpoint:** `GET /departments`

**Response:**
```json
{
  "items": [
    {
      "id": "dept-123e4567-e89b-12d3-a456-426614174000",
      "name": "Credit Department",
      "description": "Handles credit assessments and loan approvals",
      "manager": {
        "id": "user-123",
        "first_name": "John",
        "last_name": "Manager"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

### Create Department
Create a new department.

**Endpoint:** `POST /departments`

**Request:**
```json
{
  "name": "Risk Assessment",
  "description": "Manages risk evaluation and compliance"
}
```

**Response:**
Created department object.

---

## Branches

### Get All Branches
List all branches.

**Endpoint:** `GET /branches`

**Response:**
```json
{
  "items": [
    {
      "id": "branch-123e4567-e89b-12d3-a456-426614174000",
      "name": "Main Branch",
      "address": "123 Bank Street, New York, NY 10001",
      "phone": "+1-555-123-4567",
      "manager": {
        "id": "user-123",
        "first_name": "Branch",
        "last_name": "Manager"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 3
}
```

### Create Branch
Create a new branch.

**Endpoint:** `POST /branches`

**Request:**
```json
{
  "name": "Downtown Branch",
  "address": "456 Main Street, Los Angeles, CA 90001",
  "phone": "+1-555-987-6543"
}
```

---

## System Health

### Health Check
Check system health status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  },
  "version": "1.0.0"
}
```

### Database Health
Check database connectivity.

**Endpoint:** `GET /health/db`

**Response:**
```json
{
  "status": "healthy",
  "latency_ms": 15,
  "connections": 5
}
```

---

## Error Responses

### Standard Error Format
All errors follow this format:

```json
{
  "detail": "Error message here",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/endpoint"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Validation Error Example
```json
{
  "detail": [
    {
      "loc": ["body", "borrower_info", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Rate Limiting
- **Standard endpoints**: 100 requests per minute per IP
- **Authentication endpoints**: 5 requests per minute per IP
- **File upload endpoints**: 10 requests per minute per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

---

## Pagination
All list endpoints support pagination with the following format:

**Request Parameters:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)

**Response Format:**
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "size": 20,
  "pages": 8
}
```

---

## WebSocket Events

### Connection
Connect to real-time events:
```
ws://localhost:8000/ws/notifications
```

### Authentication
Send authentication token after connection:
```json
{
  "type": "authenticate",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Events
- `application_status_changed` - When application status changes
- `file_uploaded` - When new file is uploaded
- `review_assigned` - When reviewer is assigned
- `comment_added` - When comment is added to application

---

## Frontend Integration Examples

### Using the API Client

#### Authentication
```typescript
import { apiClient } from '@/lib/api';

// Login
const loginResponse = await apiClient.login({
  username: 'john.doe',
  password: 'securepassword123'
});

// Get current user
const user = await apiClient.getCurrentUser();

// Logout
await apiClient.logout();
```

#### User Management
```typescript
import { apiClient } from '@/lib/api';

// Get user details
const user = await apiClient.get('/users/123');

// Update user
const updatedUser = await apiClient.patch('/users/123', {
  first_name: 'John Updated',
  last_name: 'Doe',
  email: 'john.updated@example.com'
});

// Upload profile photo
const formData = new FormData();
formData.append('file', imageFile);
formData.append('optimize', 'true');

await apiClient.uploadFile('/users/123/profile-photo', imageFile);
```

#### Applications Management
```typescript
import { apiClient } from '@/lib/api';

// Get applications with pagination
const applications = await apiClient.get('/applications?page=1&size=20&status=pending');

// Create new application
const newApplication = await apiClient.post('/applications', {
  full_name_latin: 'Alice Johnson',
  phone: '+1234567890',
  requested_amount: 350000,
  loan_purposes: ['home_purchase']
});

// Submit application
await apiClient.post('/applications/123/submit');
```

### Using Permission API Client

#### Permission Management
```typescript
import { permissionsApi } from '@/lib/api/permissions';

// Get current user permissions
const userPermissions = await permissionsApi.getCurrentUserPermissions();

// Check specific permission
const hasPermission = await permissionsApi.checkPermission({
  resource: 'applications',
  action: 'create',
  scope: 'department'
});

// Get permission matrix
const matrix = await permissionsApi.getPermissionMatrix({
  department_id: 'dept-123'
});
```

#### Role Management
```typescript
import { permissionsApi } from '@/lib/api/permissions';

// List roles
const roles = await permissionsApi.listRoles({
  page: 1,
  size: 20,
  search: 'manager'
});

// Assign role to user
await permissionsApi.assignRoleToUser('user-123', {
  role_id: 'role-456',
  assigned_by: 'admin-user'
});

// Get user roles
const userRoles = await permissionsApi.getUserRoles('user-123');
```

### File Upload Handling

#### Direct Upload
```typescript
import { apiClient } from '@/lib/api';

// Get upload URL for direct client upload
const uploadUrlResponse = await apiClient.post('/files/upload-url', {
  filename: 'document.pdf',
  content_type: 'application/pdf',
  application_id: 'app-123'
});

// Upload directly to MinIO
await fetch(uploadUrlResponse.upload_url, {
  method: 'PUT',
  body: file,
  headers: uploadUrlResponse.fields
});

// Finalize upload
await apiClient.post('/files/finalize', {
  object_name: uploadUrlResponse.object_name,
  filename: 'document.pdf',
  application_id: 'app-123'
});
```

#### Server-side Upload
```typescript
import { apiClient } from '@/lib/api';

const formData = new FormData();
formData.append('file', file);
formData.append('application_id', 'app-123');
formData.append('description', 'Income proof document');

const uploadedFile = await apiClient.uploadFile('/files/upload', file);
```

### Error Handling

#### Frontend Error Handling
```typescript
import { apiClient } from '@/lib/api';
import { handleApiError } from '@/lib/handleApiError';

try {
  const result = await apiClient.get('/applications/123');
} catch (error) {
  // Error is automatically handled by interceptors
  // Custom error handling if needed
  console.error('API Error:', error);
}
```

#### Permission Error Handling
```typescript
import { permissionsApi } from '@/lib/api/permissions';
import { isPermissionError, isApiError } from '@/lib/api/permissionErrors';

try {
  await permissionsApi.assignRoleToUser('user-123', { role_id: 'role-456' });
} catch (error) {
  if (isPermissionError(error)) {
    console.error('Permission denied:', error.getUserFriendlyMessage());
  } else if (isApiError(error)) {
    console.error('API error:', error.getUserFriendlyMessage());
  }
}
```

---

## SDK Examples

### Python
```python
import requests

# Authentication
response = requests.post(
    'http://localhost:8000/api/v1/auth/login',
    json={'username': 'user', 'password': 'pass'}
)
token = response.json()['access_token']

# Get applications
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:8000/api/v1/applications',
    headers=headers
)
applications = response.json()
```

### JavaScript
```javascript
// Authentication
const authResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});
const { access_token } = await authResponse.json();

// Get applications
const response = await fetch('/api/v1/applications', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const applications = await response.json();
```

### cURL
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Get applications with token
curl -X GET http://localhost:8000/api/v1/applications \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Integration Guides

### Environment Configuration

#### Frontend Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8090/api/ws/
NEXT_SECRET_KEY=your-secret-key-here
```

#### Backend Environment Variables
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost/lc_workflow
SECRET_KEY=your-jwt-secret-key
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio-access-key
MINIO_SECRET_KEY=minio-secret-key
REDIS_URL=redis://localhost:6379
```

### CORS Configuration
The frontend proxy handles CORS automatically. For direct backend access, ensure proper CORS headers are configured.

### Rate Limiting
- **Authentication endpoints**: 5 requests per minute per IP
- **Standard endpoints**: 100 requests per minute per IP
- **File upload endpoints**: 10 requests per minute per user

### WebSocket Integration

#### Connection Setup
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/notifications');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'your-jwt-token'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'application_status_changed') {
    // Handle application status change
    console.log('Application updated:', data.application_id);
  }
};
```

### File Storage Integration

#### MinIO Configuration
```python
# Backend configuration
MINIO_CLIENT = Minio(
    endpoint="localhost:9000",
    access_key="minio-access-key",
    secret_key="minio-secret-key",
    secure=False
)
```

#### CDN Integration (Optional)
For production deployments, integrate with a CDN for faster file delivery:

```typescript
// Frontend configuration
const CDN_BASE_URL = 'https://cdn.example.com';

// Use CDN URLs for faster loading
const cdnUrl = fileUrl.replace(MINIO_BASE_URL, CDN_BASE_URL);
```

### Database Schema Overview

#### Core Tables
- `users` - User accounts and authentication
- `departments` - Organizational departments
- `branches` - Branch locations
- `customer_applications` - Loan applications
- `files` - File attachments and documents
- `permissions` - Permission definitions
- `roles` - User roles
- `user_permissions` - User permission assignments
- `audit_log` - Permission change audit trail

### Deployment Considerations

#### Health Checks
```bash
# Backend health check
curl http://localhost:8000/health

# Database health check
curl http://localhost:8000/health/db
```

#### Monitoring
- Enable structured logging for all API requests
- Monitor response times and error rates
- Set up alerts for 5xx errors and authentication failures

---

## Changelog

### Version 1.0.0
- Initial API release
- Basic CRUD operations for applications, users, and files
- Authentication and authorization
- File upload with MinIO integration
- Real-time notifications via WebSocket
- Permission-based access control
- Frontend proxy routes for enhanced security
- Comprehensive error handling and retry logic
- Audit trail for permission changes
- User lifecycle management
- CSV import/export functionality