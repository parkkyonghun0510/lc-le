# LC Workflow Backend - Complete API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

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
    "full_name": "John Doe",
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
      "full_name": "John Doe",
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
  "full_name": "Jane Smith",
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
  "full_name": "Jane Smith",
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
  "full_name": "John Doe",
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
  "full_name": "John Updated Doe",
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
      "borrower_info": {
        "full_name": "Alice Johnson",
        "date_of_birth": "1985-03-15",
        "phone_number": "+1234567890",
        "email": "alice@example.com",
        "marital_status": "married",
        "nationality": "US",
        "ssn": "123-45-6789"
      },
      "address": {
        "street_address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip_code": "10001",
        "country": "US",
        "address_type": "residential"
      },
      "employment": {
        "employer_name": "Tech Corp",
        "job_title": "Software Engineer",
        "employment_type": "full_time",
        "monthly_income": 8000,
        "employment_duration": "5 years"
      },
      "loan_details": {
        "loan_amount": 350000,
        "loan_purpose": "home_purchase",
        "loan_term": 360,
        "interest_rate": 3.5,
        "property_type": "single_family",
        "property_value": 450000,
        "down_payment": 100000
      },
      "status": "submitted",
      "workflow_stage": "credit_check",
      "risk_assessment": {
        "credit_score": 750,
        "debt_to_income_ratio": 0.35,
        "risk_level": "low",
        "risk_factors": ["stable_employment"]
      },
      "assigned_reviewer": {
        "id": "user-123",
        "full_name": "John Reviewer",
        "email": "john@example.com"
      },
      "submitted_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
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
  "borrower_info": {
    "full_name": "Alice Johnson",
    "date_of_birth": "1985-03-15",
    "phone_number": "+1234567890",
    "email": "alice@example.com",
    "marital_status": "married",
    "nationality": "US",
    "ssn": "123-45-6789"
  },
  "address": {
    "street_address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "country": "US"
  },
  "employment": {
    "employer_name": "Tech Corp",
    "job_title": "Software Engineer",
    "employment_type": "full_time",
    "monthly_income": 8000,
    "employment_duration": "5 years"
  },
  "loan_details": {
    "loan_amount": 350000,
    "loan_purpose": "home_purchase",
    "loan_term": 360,
    "interest_rate": 3.5,
    "property_type": "single_family",
    "property_value": 450000,
    "down_payment": 100000
  },
  "guarantor_info": {
    "full_name": "Bob Johnson",
    "relationship": "spouse",
    "monthly_income": 6000,
    "phone_number": "+1234567891"
  },
  "financial_info": {
    "monthly_expenses": 4000,
    "existing_loans": 500,
    "assets": [
      {
        "type": "savings_account",
        "value": 50000,
        "institution": "Bank of America"
      }
    ]
  }
}
```

**Response:**
```json
{
  "id": "app-123e4567-e89b-12d3-a456-426614174000",
  "borrower_info": { ... },
  "address": { ... },
  "employment": { ... },
  "loan_details": { ... },
  "status": "draft",
  "workflow_stage": "initial",
  "created_by": {
    "id": "user-123",
    "full_name": "System User"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
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
  "borrower_info": {
    "phone_number": "+1234567899"
  },
  "loan_details": {
    "loan_amount": 375000
  }
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
    "full_name": "John Reviewer"
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
    "full_name": "John Doe"
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
        "full_name": "John Doe"
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
        "full_name": "John Manager"
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
        "full_name": "Branch Manager"
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

## Changelog

### Version 1.0.0
- Initial API release
- Basic CRUD operations for applications, users, and files
- Authentication and authorization
- File upload with MinIO integration
- Real-time notifications via WebSocket