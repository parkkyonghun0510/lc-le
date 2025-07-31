# Frontend Blueprint for LC Work Flow Application

## Overview
This blueprint outlines the frontend architecture for the LC Work Flow application, designed to work seamlessly with the FastAPI backend. The frontend will be a modern React-based web application with TypeScript, providing a comprehensive loan application management system.

## Technology Stack

### Core Technologies
- **React 18** with TypeScript for type safety
- **Next.js 14** for server-side rendering and optimal performance
- **Tailwind CSS** for utility-first styling
- **React Query (TanStack Query)** for data fetching and caching
- **React Hook Form** for form management with validation
- **React Router** for client-side routing
- **Axios** for HTTP requests
- **React Table** for data tables and pagination

### UI/UX Libraries
- **Headless UI** for accessible components
- **Heroicons** for consistent iconography
- **Framer Motion** for smooth animations
- **React Hot Toast** for notifications
- **React Select** for enhanced select inputs

### Development Tools
- **ESLint** and **Prettier** for code quality
- **Husky** for git hooks
- **Vercel** for deployment

## Project Structure

```
lc-workflow-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── applications/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── users/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── departments/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── branches/
│   │   │       ├── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/route.ts
│   │   │   └── uploadthing/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── footer.tsx
│   │   ├── forms/
│   │   │   ├── application-form.tsx
│   │   │   ├── user-form.tsx
│   │   │   ├── department-form.tsx
│   │   │   └── branch-form.tsx
│   │   ├── tables/
│   │   │   ├── applications-table.tsx
│   │   │   ├── users-table.tsx
│   │   │   ├── departments-table.tsx
│   │   │   └── branches-table.tsx
│   │   └── features/
│   │       ├── file-upload/
│   │       │   ├── dropzone.tsx
│   │       │   └── file-list.tsx
│   │       ├── search/
│   │       │   └── search-bar.tsx
│   │       └── auth/
│   │           ├── login-form.tsx
│   │           └── user-menu.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── types.ts
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-applications.ts
│   │   │   ├── use-users.ts
│   │   │   ├── use-departments.ts
│   │   │   └── use-branches.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   └── store/
│   │       ├── auth-store.ts
│   │       └── app-store.ts
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       ├── api.ts
│       ├── models.ts
│       └── index.ts
├── public/
│   ├── images/
│   └── icons/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## API Integration Layer

### Base API Client Configuration
```typescript
// src/lib/api/client.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Endpoints Mapping
Based on the backend API structure:

#### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Get current user

#### Applications Endpoints
- `GET /applications` - List applications (with pagination, search, filtering)
- `POST /applications` - Create new application
- `GET /applications/:id` - Get application details
- `PUT /applications/:id` - Update application
- `DELETE /applications/:id` - Delete application
- `PATCH /applications/:id/submit` - Submit application for review

#### Users Endpoints
- `GET /users` - List users (admin/manager only)
- `POST /users` - Create new user (admin/manager only)
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin only)

#### Departments Endpoints
- `GET /departments` - List departments
- `POST /departments` - Create department (admin/manager only)
- `GET /departments/:id` - Get department details
- `PUT /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department (admin only)

#### Branches Endpoints
- `GET /branches` - List branches
- `POST /branches` - Create branch (admin/manager only)
- `GET /branches/:id` - Get branch details
- `PUT /branches/:id` - Update branch
- `DELETE /branches/:id` - Delete branch (admin only)

#### Files Endpoints
- `POST /files/upload` - Upload file
- `GET /files` - List files
- `GET /files/:id` - Get file details
- `DELETE /files/:id` - Delete file
- `GET /files/:id/download` - Download file

## Data Models and Types

### Core TypeScript Interfaces
```typescript
// src/types/models.ts
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: 'admin' | 'manager' | 'officer';
  status: 'active' | 'inactive';
  department_id?: string;
  branch_id?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone_number?: string;
  email?: string;
  manager_id?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerApplication {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  
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
  desired_loan_term?: string;
  requested_disbursement_date?: string;
  
  // Guarantor Information
  guarantor_name?: string;
  guarantor_phone?: string;
  
  // Additional data
  collaterals?: Collateral[];
  documents?: Document[];
  
  // Metadata
  created_at: string;
  updated_at: string;
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

export interface Document {
  type: string;
  name: string;
  file_id: string;
  upload_date: string;
}

export interface File {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  application_id?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

## Key Features Implementation

### 1. Authentication System
- JWT token management with automatic refresh
- Role-based access control (RBAC)
- Protected routes based on user roles
- Session persistence with secure storage

### 2. Dashboard Overview
- Key metrics cards (total applications, pending, approved, rejected)
- Recent applications list
- Activity timeline
- Quick actions for common tasks

### 3. Application Management
- Multi-step application forms with validation
- File upload with drag-and-drop support
- Application status tracking
- Search and filtering capabilities
- Export functionality

### 4. User Management
- User creation and editing forms
- Role assignment interface
- Department and branch association
- Profile management

### 5. Department & Branch Management
- Hierarchical organization structure
- Manager assignment
- Location mapping (with Google Maps integration)
- Active/inactive status management

### 6. File Management
- Secure file upload with validation
- File preview for common formats
- Download functionality
- File organization by application

## UI/UX Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Main actions and branding
- **Secondary**: Gray (#6b7280) - Supporting elements
- **Success**: Green (#10b981) - Success states and approvals
- **Warning**: Yellow (#f59e0b) - Pending states
- **Error**: Red (#ef4444) - Errors and rejections

### Typography
- **Headings**: Inter font family
- **Body**: System fonts for performance
- **Monospace**: For code and technical data

### Component Library
- **Buttons**: Primary, secondary, danger variants
- **Forms**: Input, select, textarea, checkbox, radio
- **Tables**: Sortable, filterable, paginated
- **Modals**: Confirmation, form, detail views
- **Cards**: Information display, summaries
- **Navigation**: Sidebar, header, breadcrumbs

## Security Considerations

### Frontend Security
- Input validation and sanitization
- XSS protection
- CSRF token handling
- Secure file upload restrictions
- Rate limiting for API calls

### Data Protection
- Sensitive data encryption in transit
- Local storage security
- Session timeout handling
- Role-based UI rendering

## Performance Optimization

### Code Splitting
- Route-based code splitting with Next.js
- Component lazy loading
- Image optimization with Next.js Image

### Caching Strategy
- React Query for API response caching
- Browser caching headers
- Service worker for offline capability

### Bundle Optimization
- Tree shaking for unused code
- Dynamic imports for heavy components
- CDN integration for static assets

## Deployment Configuration

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://api.lc-workflow.com
NEXT_PUBLIC_APP_NAME=LC Work Flow
NEXTAUTH_URL=https://app.lc-workflow.com
NEXTAUTH_SECRET=your-secret-key
```

### Build Configuration
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Vercel Deployment
- Automatic deployments from GitHub
- Environment variable configuration
- Custom domain setup
- SSL certificate management

## Development Workflow

### Git Branching Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Critical bug fixes

### Code Review Process
- Pull request reviews
- Automated testing with GitHub Actions
- ESLint and Prettier checks
- Build verification

## Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- API mocking with MSW
- Form validation testing
- Hook testing

### Integration Testing
- End-to-end testing with Playwright
- User flow testing
- Authentication flow testing
- File upload testing

### Performance Testing
- Lighthouse audits
- Bundle size monitoring
- Load testing for API endpoints

## Next Steps

1. **Initialize Next.js Project** - Set up the basic project structure
2. **Configure TypeScript** - Set up strict type checking
3. **Install Dependencies** - Install all required packages
4. **Set Up Authentication** - Configure NextAuth.js
5. **Create API Layer** - Set up API client and hooks
6. **Build Core Components** - Create reusable UI components
7. **Implement Dashboard** - Build the main dashboard view
8. **Add Forms** - Create application and user forms
9. **Testing Setup** - Configure testing framework
10. **Deployment** - Deploy to Vercel

This blueprint provides a comprehensive foundation for building a modern, scalable frontend that perfectly integrates with your FastAPI backend.