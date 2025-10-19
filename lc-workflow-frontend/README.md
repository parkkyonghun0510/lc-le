# LC Workflow Frontend

A modern, responsive web application for managing loan applications and customer workflows.

## Features

- **User Authentication**: Secure login with JWT tokens and automatic token refresh
- **Permission-Based Access Control**: Fine-grained RBAC system with roles, permissions, and scopes (see [PERMISSION_MIGRATION_GUIDE.md](./PERMISSION_MIGRATION_GUIDE.md))
- **Application Management**: Create, view, edit, and track loan applications
- **User Management**: Admin interface for managing system users
- **Department & Branch Management**: Organize users by department and branch
- **File Upload & Management**: Secure file storage with role-based access
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Automatic data synchronization using React Query
- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Dynamic Theme System**: Light, dark, and system theme modes with customizable colors
- **Accessibility Features**: High contrast mode and adjustable font scaling

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Tables**: React Table (TanStack Table)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Update the environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── applications/      # Applications management
│   ├── login/           # Login page
│   └── unauthorized/    # Access denied page
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── examples/         # Theme system example components
│   └── layout/           # Layout components (Header, Sidebar)
├── hooks/                # Custom React hooks
│   ├── useAuth.ts      # Authentication hooks
│   ├── useApplications.ts # Application management hooks
│   ├── useUsers.ts     # User management hooks
│   ├── useDepartments.ts # Department management hooks
│   ├── useBranches.ts  # Branch management hooks
│   ├── useFiles.ts     # File management hooks
│   └── useThemeSettings.ts # Theme system hooks
├── lib/                  # Utility functions
│   └── api.ts          # API client configuration
├── providers/            # React context providers
│   ├── AuthProvider.tsx # Authentication context
│   ├── QueryProvider.tsx # React Query configuration
│   └── ThemeProvider.tsx # Theme system context
└── types/                # TypeScript type definitions
    └── models.ts         # API response and model types
```

## API Integration

The frontend integrates with a REST API backend with the following endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user

### Applications
- `GET /api/applications` - List applications (with pagination)
- `POST /api/applications` - Create new application
- `GET /api/applications/{id}` - Get application details
- `PUT /api/applications/{id}` - Update application
- `DELETE /api/applications/{id}` - Delete application

### Users
- `GET /api/users` - List users (with pagination)
- `POST /api/users` - Create new user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department
- `PUT /api/departments/{id}` - Update department
- `DELETE /api/departments/{id}` - Delete department

### Branches
- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch
- `PUT /api/branches/{id}` - Update branch
- `DELETE /api/branches/{id}` - Delete branch

### Files
- `POST /api/files/upload` - Upload files
- `GET /api/files` - List files
- `GET /api/files/{id}/download` - Download file
- `DELETE /api/files/{id}` - Delete file

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=LC Workflow
```

### Adding New Features

1. Create the necessary TypeScript types in `src/types/models.ts`
2. Add API methods in `src/lib/api.ts`
3. Create React Query hooks in `src/hooks/`
4. Build UI components in `src/components/`
5. Add routes in `src/app/`

### Permission System

The application uses a comprehensive fine-grained permission-based access control (RBAC) system with roles, permissions, and scopes.

**Migration Status**: 🟢 **85% Complete** - Core infrastructure and most pages migrated

⚠️ **Deprecated APIs (DO NOT USE):**
- `useRole()` hook is deprecated - use `usePermissionCheck()` instead
- `isAdmin`, `isManager`, `isOfficer` from AuthContext are deprecated
- Direct `user?.role` or `user.role` checks for authorization are deprecated

✅ **Use the new permission system:**

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { can, hasRole, isAdmin } = usePermissionCheck();
  
  // Check specific permission with scope
  if (can('application', 'approve', 'department')) {
    // User can approve applications at department level
  }
  
  // Check if user has admin role
  if (isAdmin()) {
    // User is an admin
  }
  
  // Check any role
  if (hasRole('manager')) {
    // User has manager role
  }
}
```

**📖 Documentation:**
- [PERMISSION_MIGRATION_GUIDE.md](./PERMISSION_MIGRATION_GUIDE.md) - Complete migration guide with examples
- [FINAL_MIGRATION_STATUS.md](../FINAL_MIGRATION_STATUS.md) - Current migration status and remaining work
- [TASK_11.6_FINAL_CLEANUP_VERIFICATION.md](../TASK_11.6_FINAL_CLEANUP_VERIFICATION.md) - Detailed verification report

**✅ Migrated Pages:**
- Dashboard, Applications, Users, Branches, Departments, Files

**⚠️ Pages Still Using Old System:**
- Settings, Profile, Employee Workload, Admin Migration, Notifications, Mobile Layout

**Note:** Display-only usage of `user.role` (e.g., showing role badges) is acceptable and does not affect security.

### Theme Integration

To use the theme system in your components:

1. Import the theme hook: `import { useTheme } from "@/providers/ThemeProvider"`
2. Access theme properties: `const { theme, themeConfig } = useTheme()`
3. Apply theme colors dynamically based on the current theme mode

See `THEME_USAGE_GUIDE.md` for detailed implementation examples.

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository on Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
```

### Railway Deployment

1. Create a new project on Railway
2. Connect your GitHub repository
3. Railway will automatically detect the Dockerfile
4. Set the following environment variables in Railway:
   - `NEXT_PUBLIC_API_URL` - Your backend API URL
   - `NEXT_PUBLIC_WS_URL` - Your WebSocket URL
   - `NEXT_SECRET_KEY` - Your secret key for encryption
5. Deploy the application

The application will be available at `https://your-project.up.railway.app`

For production deployments, make sure to:
- Update the environment variables to point to your production backend
- Set proper security headers
- Configure custom domains if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software for internal use only.
