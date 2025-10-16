# Management Structure Update Plan

## Goal
Change portfolio and line manager selection from **Users** to **Employees**

## Current State
- Portfolio Manager: Selected from Users table
- Line Manager: Selected from Users table
- Foreign keys: `portfolio_id` → `users.id`, `line_manager_id` → `users.id`

## Target State
- Portfolio Manager: Selected from Employees table
- Line Manager: Selected from Employees table  
- Foreign keys: `portfolio_id` → `employees.id`, `line_manager_id` → `employees.id`

## Changes Required

### 1. Backend - Database Migration
**File:** New migration file
- Change `users.portfolio_id` foreign key from `users.id` to `employees.id`
- Change `users.line_manager_id` foreign key from `users.id` to `employees.id`
- Update existing data (if any)

### 2. Backend - Models
**File:** `le-backend/app/models.py`
- Update `User.portfolio_id` ForeignKey to reference `employees.id`
- Update `User.line_manager_id` ForeignKey to reference `employees.id`
- Update relationships to use Employee model

### 3. Backend - Schemas
**File:** `le-backend/app/schemas.py`
- Update `UserResponse` to include Employee objects instead of User objects
- Change `portfolio` and `line_manager` fields to return Employee data

### 4. Frontend - Types
**File:** `lc-workflow-frontend/src/types/models.ts`
- Update `User` interface: `portfolio` and `line_manager` should be `Employee` type

### 5. Frontend - User Edit Form
**File:** `lc-workflow-frontend/app/users/[id]/edit/page.tsx`
- Replace `useUsers()` with `useEmployees()` for dropdown data
- Update dropdown to show employee names and codes
- Filter employees by branch (keep existing logic)

### 6. Frontend - User Display Components
**Files:**
- `lc-workflow-frontend/src/components/users/UserList.tsx`
- `lc-workflow-frontend/src/components/users/UserCard.tsx`
- `lc-workflow-frontend/app/users/[id]/page.tsx`
- Update to display Employee data (with employee codes)

## Benefits
1. ✅ Consistent with system design (Employees for work assignments)
2. ✅ Can assign managers who don't have system login
3. ✅ Better separation of concerns
4. ✅ Aligns with employee assignment system

## Implementation Order
1. Backend migration
2. Backend models
3. Backend schemas
4. Frontend types
5. Frontend forms
6. Frontend display components
