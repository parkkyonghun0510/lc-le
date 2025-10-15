# Dashboard Recent Applications - Today Filter Update

## Summary
Updated the `/api/v1/dashboard/recent-applications` endpoint to show only today's applications by default, with an option to view all recent applications.

## Changes Made

### Backend Changes (`le-backend/app/routers/dashboard.py`)

1. **Added `today_only` parameter** to the `get_recent_applications` endpoint:
   - Default value: `True` (shows only today's applications)
   - When `True`: Filters applications created today (from 00:00:00 to 23:59:59 UTC)
   - When `False`: Shows all recent applications (previous behavior)

2. **Updated endpoint signature**:
   ```python
   async def get_recent_applications(
       limit: int = 10,
       today_only: bool = True,  # NEW PARAMETER
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   )
   ```

3. **Added date filtering logic**:
   ```python
   # Filter by today's date if today_only is True (default)
   if today_only:
       today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
       today_end = today_start + timedelta(days=1)
       query = query.where(
           and_(
               CustomerApplication.created_at >= today_start,
               CustomerApplication.created_at < today_end
           )
       )
   ```

### Frontend Changes

#### 1. Hook Update (`lc-workflow-frontend/src/hooks/useDashboard.ts`)

- **Updated `useRecentApplications` hook** to support the new parameter:
  ```typescript
  export const useRecentApplications = (limit: number = 10, todayOnly: boolean = true)
  ```

- **Updated query key** to include `todayOnly` parameter for proper caching:
  ```typescript
  recentApplications: (limit?: number, todayOnly?: boolean) => [...dashboardKeys.all, 'recent-applications', limit, todayOnly]
  ```

#### 2. API Route Update (`lc-workflow-frontend/app/api/dashboard/recent-applications/route.ts`)

- **Added `today_only` parameter** to the frontend API route:
  ```typescript
  const todayOnly = searchParams.get('today_only') || 'true';
  const applications = await apiClient.get(`/dashboard/recent-applications?limit=${limit}&today_only=${todayOnly}`);
  ```

## Usage Examples

### Backend API Calls

1. **Get today's applications only (default)**:
   ```
   GET /api/v1/dashboard/recent-applications
   GET /api/v1/dashboard/recent-applications?today_only=true
   ```

2. **Get all recent applications**:
   ```
   GET /api/v1/dashboard/recent-applications?today_only=false
   ```

3. **Get today's applications with custom limit**:
   ```
   GET /api/v1/dashboard/recent-applications?limit=5&today_only=true
   ```

### Frontend Hook Usage

1. **Default usage (today's applications)**:
   ```typescript
   const { data: applications } = useRecentApplications();
   ```

2. **Get all recent applications**:
   ```typescript
   const { data: applications } = useRecentApplications(10, false);
   ```

3. **Get today's applications with custom limit**:
   ```typescript
   const { data: applications } = useRecentApplications(5, true);
   ```

## Benefits

1. **Improved Performance**: By default, only today's applications are loaded, reducing database load and improving response times
2. **Better User Experience**: Users see the most relevant (today's) applications first
3. **Backward Compatibility**: Existing functionality is preserved with the `today_only=false` option
4. **Flexible**: Frontend can easily switch between today-only and all-applications views

## Testing

A test script has been created (`test_dashboard_today_filter.py`) to verify the functionality. Run it to test different parameter combinations:

```bash
python test_dashboard_today_filter.py
```

## Migration Notes

- **No breaking changes**: The default behavior now shows today's applications, but the old behavior can be accessed with `today_only=false`
- **Frontend components**: Any existing frontend components using `useRecentApplications()` will automatically get today's applications by default
- **API consumers**: External API consumers can continue using the endpoint as before, or add `today_only=false` to maintain the previous behavior

## Security & Permissions

The existing role-based access control is maintained:
- **Officers**: See only their own applications (today's or all, based on parameter)
- **Managers**: See applications from their department (today's or all, based on parameter)  
- **Admins**: See all applications (today's or all, based on parameter)