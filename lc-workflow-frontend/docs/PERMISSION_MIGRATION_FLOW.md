# Permission Migration Flow Diagram

## Overview

This document provides visual representations of how the permission migration utilities work.

## Permission Check Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Renders                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         usePermissionMigration() Hook Called                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Check Loading State                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ if (loading) return null or <Spinner />              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           can(resource, action, scope) Called                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         Try Permission System (usePermissionCheck)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Query backend RBAC API                               │   │
│  │ Check user's effective permissions                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              ┌───────┴────────┐
              │                │
              ▼                ▼
    ┌─────────────┐   ┌─────────────┐
    │  Granted?   │   │  Denied?    │
    │  (true)     │   │  (false)    │
    └──────┬──────┘   └──────┬──────┘
           │                 │
           │                 ▼
           │      ┌─────────────────────────┐
           │      │  Try Role Fallback      │
           │      │  (DEFAULT_ROLE_MAPPINGS)│
           │      └──────┬──────────────────┘
           │             │
           │             ▼
           │      ┌──────┴───────┐
           │      │              │
           │      ▼              ▼
           │  ┌────────┐    ┌────────┐
           │  │Granted?│    │Denied? │
           │  │(true)  │    │(false) │
           │  └───┬────┘    └───┬────┘
           │      │             │
           ▼      ▼             ▼
    ┌──────────────────────────────┐
    │    Log Result & Return       │
    │  ✅ ALLOWED (permission)     │
    │  ✅ ALLOWED (fallback)       │
    │  ❌ DENIED                   │
    └──────────────────────────────┘
```

## Migration Phases

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: Setup                            │
│                   (Task 11.1 - COMPLETE)                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Create migration utilities                               │
│  ✅ Create React hooks                                       │
│  ✅ Write documentation                                      │
│  ✅ Create examples                                          │
│  ✅ Write tests                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: Gradual Migration                      │
│                   (Tasks 11.2-11.5)                          │
├─────────────────────────────────────────────────────────────┤
│  ⏳ Task 11.2: Dashboard & Applications                      │
│  ⏳ Task 11.3: User & Admin pages                            │
│  ⏳ Task 11.4: File & Branch management                      │
│  ⏳ Task 11.5: Component-level access                        │
│                                                              │
│  Strategy:                                                   │
│  • Keep old role checks working                             │
│  • Add new permission checks alongside                      │
│  • Test thoroughly                                           │
│  • Monitor with logging                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                PHASE 3: Cleanup                              │
│                   (Task 11.6)                                │
├─────────────────────────────────────────────────────────────┤
│  ⏳ Remove useRole() hook                                    │
│  ⏳ Remove role-specific flags from AuthProvider             │
│  ⏳ Clean up remaining role checks                           │
│  ⏳ Update documentation                                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Migration Pattern

### Before Migration

```
┌─────────────────────────────────────────────────────────────┐
│                    MyComponent.tsx                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  import { useRole } from '@/hooks/useAuth';                  │
│                                                              │
│  function MyComponent() {                                    │
│    const { isAdmin, isManager } = useRole();                │
│                                                              │
│    if (!isAdmin && !isManager) {                            │
│      return <AccessDenied />;                               │
│    }                                                         │
│                                                              │
│    return <Content />;                                       │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### During Migration (Transition)

```
┌─────────────────────────────────────────────────────────────┐
│                    MyComponent.tsx                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  import { usePermissionMigration } from                      │
│    '@/hooks/usePermissionMigration';                         │
│                                                              │
│  function MyComponent() {                                    │
│    const { can, loading } = usePermissionMigration();       │
│                                                              │
│    if (loading) return <Spinner />;                         │
│                                                              │
│    // New permission check with automatic fallback          │
│    if (!can('application', 'read', 'department')) {         │
│      return <AccessDenied />;                               │
│    }                                                         │
│                                                              │
│    return <Content />;                                       │
│  }                                                           │
│                                                              │
│  // Old role checks still work via fallback!                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### After Migration (Final)

```
┌─────────────────────────────────────────────────────────────┐
│                    MyComponent.tsx                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  import { usePermissionCheck } from                          │
│    '@/hooks/usePermissionCheck';                             │
│                                                              │
│  function MyComponent() {                                    │
│    const { can, loading } = usePermissionCheck();           │
│                                                              │
│    if (loading) return <Spinner />;                         │
│                                                              │
│    // Pure permission check (no fallback needed)            │
│    if (!can('application', 'read', 'department')) {         │
│      return <AccessDenied />;                               │
│    }                                                         │
│                                                              │
│    return <Content />;                                       │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Permission Check Decision Tree

```
                    ┌─────────────────┐
                    │  Permission     │
                    │  Check Request  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Is Loading?    │
                    └────┬────────┬───┘
                         │        │
                    Yes  │        │  No
                         │        │
                         ▼        ▼
                    ┌────────┐  ┌──────────────────┐
                    │ Return │  │ Check Permission │
                    │  null  │  │     System       │
                    └────────┘  └────────┬─────────┘
                                         │
                                         ▼
                              ┌──────────┴──────────┐
                              │                     │
                         Yes  │                     │  No
                              │                     │
                              ▼                     ▼
                    ┌──────────────┐      ┌─────────────────┐
                    │   GRANTED    │      │  Check Role     │
                    │  (permission)│      │    Fallback     │
                    └──────────────┘      └────────┬────────┘
                                                   │
                                                   ▼
                                        ┌──────────┴──────────┐
                                        │                     │
                                   Yes  │                     │  No
                                        │                     │
                                        ▼                     ▼
                              ┌──────────────┐      ┌──────────────┐
                              │   GRANTED    │      │    DENIED    │
                              │  (fallback)  │      │              │
                              └──────────────┘      └──────────────┘
```

## Logging Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Permission Check Executed                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         checkPermissionWithFallback() Called                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Create Log Entry                                │
│  {                                                           │
│    userId: 'user-123',                                       │
│    resource: 'application',                                  │
│    action: 'update',                                         │
│    scope: 'department',                                      │
│    result: {                                                 │
│      allowed: true,                                          │
│      source: 'permission',                                   │
│      reason: 'Permission granted by RBAC',                   │
│      timestamp: Date                                         │
│    }                                                         │
│  }                                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           permissionLogger.log(entry)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──────────────────┬──────────────────┐
                      │                  │                  │
                      ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
            │ Store in     │   │  Console     │  │  Update      │
            │  Memory      │   │    Log       │  │  Statistics  │
            │ (last 1000)  │   │ (dev only)   │  │              │
            └──────────────┘   └──────────────┘  └──────────────┘
                      │                  │                  │
                      └──────────────────┴──────────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │  Available for   │
                              │  • getLogs()     │
                              │  • export()      │
                              │  • getStatus()   │
                              └──────────────────┘
```

## Hook Composition

```
┌─────────────────────────────────────────────────────────────┐
│              usePermissionMigration()                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         usePermissionCheck()                       │     │
│  │  • Fetches permissions from backend                │     │
│  │  • Caches with React Query                         │     │
│  │  • Provides can(), hasRole(), isAdmin()            │     │
│  └────────────────────────────────────────────────────┘     │
│                          +                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │              useAuth()                             │     │
│  │  • Provides user data                              │     │
│  │  • Provides user.role for fallback                 │     │
│  └────────────────────────────────────────────────────┘     │
│                          +                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │      Migration Utilities                           │     │
│  │  • createPermissionChecker()                       │     │
│  │  • checkPermissionWithFallback()                   │     │
│  │  • permissionLogger                                │     │
│  └────────────────────────────────────────────────────┘     │
│                          ║                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Returns Enhanced API                       │     │
│  │  • can() - with fallback                           │     │
│  │  • canWithDetails() - with metadata                │     │
│  │  • isAdmin() - with fallback                       │     │
│  │  • hasRole() - with fallback                       │     │
│  │  • loading, error, user, etc.                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   Backend    │
│   RBAC API   │
└──────┬───────┘
       │
       │ HTTP Request
       │
       ▼
┌──────────────────────┐
│   React Query        │
│   (Caching Layer)    │
└──────┬───────────────┘
       │
       │ Cached Data
       │
       ▼
┌──────────────────────┐
│ usePermissionCheck() │
│ (Permission System)  │
└──────┬───────────────┘
       │
       │ Permission Result
       │
       ▼
┌─────────────────────────────┐
│ usePermissionMigration()    │
│ (Migration Layer)           │
├─────────────────────────────┤
│ • Try permission system     │
│ • Fall back to role check   │
│ • Log result                │
└──────┬──────────────────────┘
       │
       │ Final Result
       │
       ▼
┌──────────────────────┐
│    Component         │
│  (UI Rendering)      │
└──────────────────────┘
```

## Summary

The permission migration system provides:

1. **Seamless Transition** - Old code continues to work via fallback
2. **Gradual Migration** - Migrate one component at a time
3. **Full Visibility** - Comprehensive logging and monitoring
4. **Type Safety** - Full TypeScript support
5. **Performance** - Optimized with caching and memoization
6. **Developer Experience** - Simple, intuitive API

The migration can be done incrementally without breaking existing functionality, with full visibility into the migration progress through logging and monitoring tools.
