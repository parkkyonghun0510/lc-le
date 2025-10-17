# Audit Trail - Visual Guide

## 📸 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Permission Management                                          │
│  Manage roles, permissions, and access control                  │
├─────────────────────────────────────────────────────────────────┤
│  [Matrix] [Roles] [Users] [Permissions] [Templates] [Audit]    │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Main Audit Trail View

```
┌─────────────────────────────────────────────────────────────────┐
│  Audit Trail                                                    │
│  Track all permission changes, role assignments, and access     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔍 Filters !]  [✕ Clear Filters]     [🔄 Refresh] [📥 Export]│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✅ Role Assigned  [user_role]                             │ │
│  │                                                           │ │
│  │ 👤 Target: John Doe                                       │ │
│  │ 🛡️  Role: Manager                                         │ │
│  │ Reason: Promotion to department manager                   │ │
│  │                                                           │ │
│  │ 👤 by Admin User  🕐 Oct 17, 2025 10:30 AM  IP: 192...   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✅ Permission Granted  [user_permission]                  │ │
│  │                                                           │ │
│  │ 👤 Target: Jane Smith                                     │ │
│  │ 🛡️  Permission: application_approve                       │ │
│  │ Reason: Temporary approval authority                      │ │
│  │                                                           │ │
│  │ 👤 by Admin User  🕐 Oct 17, 2025 09:15 AM  IP: 192...   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔵 Permission Updated  [permission]                       │ │
│  │                                                           │ │
│  │ 🛡️  Permission: user_delete                               │ │
│  │                                                           │ │
│  │ 👤 by Security Admin  🕐 Oct 17, 2025 08:00 AM           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ❌ Role Revoked  [user_role]                              │ │
│  │                                                           │ │
│  │ 👤 Target: Bob Wilson                                     │ │
│  │ 🛡️  Role: Officer                                         │ │
│  │ Reason: End of contract                                   │ │
│  │                                                           │ │
│  │ 👤 by HR Manager  🕐 Oct 16, 2025 05:00 PM               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Showing 1-50 of 150 entries                                   │
│                                    [Previous] Page 1 of 3 [Next]│
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Filter Panel (Expanded)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Filters                                                     ││
│  │                                                             ││
│  │ Action Type          Entity Type         Search            ││
│  │ [All Actions ▼]     [All Types ▼]       [🔍 Search...]    ││
│  │                                                             ││
│  │ Start Date           End Date                              ││
│  │ [2025-10-01]        [2025-10-17]                          ││
│  │                                                             ││
│  │                                    [Cancel] [Apply Filters] ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Color-Coded Action Badges

### Green Badges (Grants/Creations)
```
┌──────────────────────┐
│ ✅ Role Assigned     │  Green background
└──────────────────────┘

┌──────────────────────┐
│ ✅ Permission Granted│  Green background
└──────────────────────┘

┌──────────────────────┐
│ ✅ Role Created      │  Green background
└──────────────────────┘
```

### Red Badges (Revocations/Deletions)
```
┌──────────────────────┐
│ ❌ Role Revoked      │  Red background
└──────────────────────┘

┌──────────────────────┐
│ ❌ Permission Revoked│  Red background
└──────────────────────┘

┌──────────────────────┐
│ ❌ Role Deleted      │  Red background
└──────────────────────┘
```

### Blue Badges (Updates/Toggles)
```
┌──────────────────────┐
│ 🔵 Permission Updated│  Blue background
└──────────────────────┘

┌──────────────────────┐
│ 🔵 Permission Toggled│  Blue background
└──────────────────────┘

┌──────────────────────┐
│ 🔵 Role Updated      │  Blue background
└──────────────────────┘
```

## 📊 Entry Details Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Icon] [Action Badge] [Entity Type Badge]                      │
│                                                                 │
│  👤 Target: [User Name]                                         │
│  🛡️  Permission/Role: [Name]                                    │
│  Reason: [Reason text if provided]                              │
│                                                                 │
│  👤 by [Performer] 🕐 [Timestamp] IP: [IP Address]              │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Loading States

### Initial Load
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         ⟳ (spinning)                            │
│                   Loading audit trail...                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Refreshing
```
┌─────────────────────────────────────────────────────────────────┐
│  [🔍 Filters]                      [⟳ Refresh] [📥 Export]      │
│                                     (spinning)                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📭 Empty States

### No Entries
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         📊 (large icon)                         │
│                     No Audit Entries                            │
│              No audit entries have been recorded yet.           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### No Results (with filters)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         📊 (large icon)                         │
│                     No Audit Entries                            │
│     No audit entries match your filters. Try adjusting your     │
│                      search criteria.                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Interactive Elements

### Filter Button States

**Inactive (no filters)**
```
┌──────────────┐
│ 🔍 Filters   │  Gray border, white background
└──────────────┘
```

**Active (filters applied)**
```
┌──────────────┐
│ 🔍 Filters ! │  Indigo border, indigo background
└──────────────┘  Badge with "!" indicator
```

### Pagination Controls

**Disabled State**
```
[Previous]  Page 1 of 3  [Next]
 (grayed)                 (active)
```

**Active State**
```
[Previous]  Page 2 of 3  [Next]
 (active)                (active)
```

## 📥 Export Flow

```
1. Click Export CSV
   ┌──────────────────┐
   │ 📥 Export CSV    │
   └──────────────────┘

2. Processing
   ┌──────────────────┐
   │ ⟳ Exporting...   │
   └──────────────────┘

3. Download starts
   audit-trail-2025-10-17.csv ⬇️
```

## 🎨 Responsive Design

### Desktop View (> 1024px)
```
┌─────────────────────────────────────────────────────────────────┐
│  [Filters] [Clear]                    [Refresh] [Export]        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Filter Panel (3 columns)                                    ││
│  │ [Action Type]  [Entity Type]  [Search]                      ││
│  │ [Start Date]   [End Date]                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Full width audit entries]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet View (768px - 1024px)
```
┌───────────────────────────────────────────┐
│  [Filters] [Clear]  [Refresh] [Export]    │
│                                           │
│  ┌───────────────────────────────────────┐│
│  │ Filter Panel (2 columns)              ││
│  │ [Action Type]  [Entity Type]          ││
│  │ [Search]                              ││
│  │ [Start Date]   [End Date]             ││
│  └───────────────────────────────────────┘│
│                                           │
│  [Audit entries]                          │
└───────────────────────────────────────────┘
```

### Mobile View (< 768px)
```
┌─────────────────────────┐
│  [Filters]              │
│  [Clear]                │
│  [Refresh] [Export]     │
│                         │
│  ┌─────────────────────┐│
│  │ Filter Panel        ││
│  │ (1 column)          ││
│  │ [Action Type]       ││
│  │ [Entity Type]       ││
│  │ [Search]            ││
│  │ [Start Date]        ││
│  │ [End Date]          ││
│  └─────────────────────┘│
│                         │
│  [Compact entries]      │
└─────────────────────────┘
```

## 🎭 Hover States

### Entry Hover
```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Role Assigned  [user_role]                                  │
│  (Background changes to light gray on hover)                    │
│  👤 Target: John Doe                                            │
│  🛡️  Role: Manager                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Button Hover
```
┌──────────────────┐      ┌──────────────────┐
│ 📥 Export CSV    │  →   │ 📥 Export CSV    │
└──────────────────┘      └──────────────────┘
 (normal)                  (darker background)
```

## ♿ Accessibility Features

### ARIA Labels
- All buttons have descriptive aria-labels
- Filter inputs have associated labels
- Audit entries have role="article"
- Action badges have semantic meaning

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons
- Escape to close filter panel
- Arrow keys for pagination

### Screen Reader Support
- Descriptive labels for all elements
- Status announcements for loading states
- Clear hierarchy with headings
- Alternative text for icons

## 🎯 User Flow Diagram

```
Start
  │
  ├─→ View Audit Trail
  │     │
  │     ├─→ See all entries (default)
  │     │
  │     ├─→ Apply Filters
  │     │     │
  │     │     ├─→ Select action type
  │     │     ├─→ Select entity type
  │     │     ├─→ Enter search term
  │     │     ├─→ Set date range
  │     │     └─→ Apply
  │     │
  │     ├─→ Navigate Pages
  │     │     │
  │     │     ├─→ Previous page
  │     │     └─→ Next page
  │     │
  │     ├─→ Export to CSV
  │     │     │
  │     │     └─→ Download file
  │     │
  │     └─→ Refresh
  │           │
  │           └─→ Get latest entries
  │
  └─→ Auto-refresh (every 30s)
        │
        └─→ Update entries automatically
```

## 📱 Mobile Optimizations

### Touch Targets
- All buttons are at least 44x44px
- Adequate spacing between interactive elements
- Large tap areas for filters and pagination

### Scrolling
- Smooth scrolling for long lists
- Sticky header for context
- Pull-to-refresh support (future)

### Performance
- Lazy loading of entries
- Optimized rendering
- Efficient re-renders

---

**Visual Guide Complete!** See [Quick Start Guide](./AUDIT_TRAIL_QUICK_START.md) for usage instructions.
