# PermissionTable Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Permission Management                                              │
│  Manage system permissions and access controls                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Search permissions...                          [Filters] Active  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Resource Type ▼  Action ▼  Scope ▼  Status ▼                │  │
│  │ [All Resources] [All Actions] [All Scopes] [All Status]     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ✓ 3 permission(s) selected                                         │
│                              [✓ Activate] [⊗ Deactivate] [🗑 Delete] │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ☐ │ Name ↑          │ Resource │ Action │ Scope  │ Created │ Status │ Actions │
├───┼─────────────────┼──────────┼────────┼────────┼─────────┼────────┼─────────┤
│ ☑ │ user:create     │ user     │ create │ global │ 1/15/25 │ Active │ ✏️ 🗑   │
│   │ Create users    │          │        │        │         │        │         │
│   │ [System]        │          │        │        │         │        │         │
├───┼─────────────────┼──────────┼────────┼────────┼─────────┼────────┼─────────┤
│ ☑ │ app:read        │ app      │ read   │ dept   │ 1/14/25 │ Active │ ✏️ 🗑   │
│   │ Read apps       │          │        │        │         │        │         │
├───┼─────────────────┼──────────┼────────┼────────┼─────────┼────────┼─────────┤
│ ☑ │ file:delete     │ file     │ delete │ own    │ 1/13/25 │ Inactive│ ✏️ 🗑   │
│   │ Delete files    │          │        │        │         │        │         │
└───┴─────────────────┴──────────┴────────┴────────┴─────────┴────────┴─────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Showing 1 to 50 of 150 results          [◀] [1] [2] [3] [4] [5] [▶]│
└─────────────────────────────────────────────────────────────────────┘
```

## Component States

### 1. Loading State
```
┌─────────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Empty State
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                              🔍                                      │
│                                                                      │
│                      No permissions found                            │
│                                                                      │
│              Try adjusting your search or filters                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Error State
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                              ⚠️                                      │
│                                                                      │
│                   Error loading permissions                          │
│                                                                      │
│                  Failed to fetch from server                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Interactive Elements

### Column Sorting
```
Click column header to sort:
┌──────────────┐
│ Name ↑       │  ← Ascending (A-Z)
└──────────────┘

┌──────────────┐
│ Name ↓       │  ← Descending (Z-A)
└──────────────┘

┌──────────────┐
│ Name         │  ← Not sorted
└──────────────┘
```

### Selection Checkboxes
```
Select All:
┌───┐
│ ☑ │  ← All selected
└───┘

┌───┐
│ ☐ │  ← None selected
└───┘

Individual:
┌───┐
│ ☑ │  ← Selected
└───┘

┌───┐
│ ☐ │  ← Not selected
└───┘
```

### Status Toggle
```
Active (clickable):
┌──────────┐
│  Active  │  ← Green background, hover effect
└──────────┘

Inactive (clickable):
┌──────────┐
│ Inactive │  ← Gray background, hover effect
└──────────┘

System (disabled):
┌──────────┐
│  Active  │  ← Green background, no hover, cursor not-allowed
└──────────┘
```

### Action Buttons
```
Edit (enabled):
┌───┐
│ ✏️ │  ← Indigo color, hover effect
└───┘

Delete (enabled):
┌───┐
│ 🗑 │  ← Red color, hover effect
└───┘

Disabled (system permission):
┌───┐
│ ✏️ │  ← Gray color, no hover, cursor not-allowed
└───┘
```

## Badge Styles

### Resource Type Badges
```
┌──────────┐
│   user   │  Purple background
└──────────┘

┌──────────┐
│   app    │  Purple background
└──────────┘

┌──────────┐
│   file   │  Purple background
└──────────┘
```

### Action Badges
```
┌──────────┐
│  create  │  Blue background
└──────────┘

┌──────────┐
│   read   │  Blue background
└──────────┘

┌──────────┐
│  delete  │  Blue background
└──────────┘
```

### Scope Badges
```
┌──────────┐
│  global  │  Green background
└──────────┘

┌──────────┐
│   dept   │  Green background
└──────────┘

┌──────────┐
│   own    │  Green background
└──────────┘
```

### System Badge
```
┌──────────┐
│  System  │  Blue background (appears below permission name)
└──────────┘
```

## Filter Panel (Expanded)
```
┌─────────────────────────────────────────────────────────────────────┐
│  Resource Type          Action              Scope            Status  │
│  ┌─────────────────┐   ┌─────────────┐    ┌──────────┐    ┌──────┐ │
│  │ All Resources ▼ │   │ All Actions▼│    │All Scopes▼│    │All ▼ │ │
│  └─────────────────┘   └─────────────┘    └──────────┘    └──────┘ │
│                                                                      │
│  When dropdown opened:                                               │
│  ┌─────────────────┐                                                │
│  │ All Resources   │                                                │
│  │ User            │  ← Hover effect                                │
│  │ Application     │                                                │
│  │ Department      │                                                │
│  │ Branch          │                                                │
│  │ File            │                                                │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Bulk Action Toolbar
```
┌─────────────────────────────────────────────────────────────────────┐
│  ✓ 3 permission(s) selected                                         │
│                                                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────┐               │
│  │ ✓ Activate   │  │ ⊗ Deactivate   │  │ 🗑 Delete │               │
│  └──────────────┘  └────────────────┘  └──────────┘               │
│   Green bg          Yellow bg           Red bg                      │
│   Hover: darker     Hover: darker       Hover: darker              │
└─────────────────────────────────────────────────────────────────────┘
```

## Pagination Controls
```
┌─────────────────────────────────────────────────────────────────────┐
│  Showing 1 to 50 of 150 results                                     │
│                                                                      │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐                 │
│  │ ◀ │  │ 1 │  │ 2 │  │ 3 │  │ 4 │  │ 5 │  │ ▶ │                 │
│  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘                 │
│  Disabled  Active  Normal  Normal  Normal  Normal  Enabled         │
│  (gray)   (indigo) (white) (white) (white) (white) (white)         │
└─────────────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (>1024px)
- Full table layout
- All columns visible
- Filters in single row
- Pagination with page numbers

### Tablet (768px - 1024px)
- Horizontal scroll for table
- Filters in grid (2x2)
- Pagination with page numbers

### Mobile (<768px)
- Horizontal scroll for table
- Filters stacked vertically
- Pagination simplified (Prev/Next only)
- Reduced padding

## Color Palette

### Primary Colors
- Indigo 600: `#4F46E5` - Primary actions, selected state
- Indigo 700: `#4338CA` - Hover state
- Indigo 50: `#EEF2FF` - Selected background

### Status Colors
- Green 100: `#DCFCE7` - Active badge background
- Green 800: `#166534` - Active badge text
- Gray 100: `#F3F4F6` - Inactive badge background
- Gray 800: `#1F2937` - Inactive badge text

### Badge Colors
- Purple 100: `#F3E8FF` - Resource type badge
- Purple 800: `#6B21A8` - Resource type text
- Blue 100: `#DBEAFE` - Action badge
- Blue 800: `#1E40AF` - Action text
- Green 100: `#DCFCE7` - Scope badge
- Green 800: `#166534` - Scope text

### Action Colors
- Red 600: `#DC2626` - Delete action
- Red 700: `#B91C1C` - Delete hover
- Yellow 100: `#FEF3C7` - Deactivate background
- Yellow 700: `#A16207` - Deactivate text

## Accessibility Features

### Keyboard Navigation
- `Tab`: Navigate between interactive elements
- `Space`: Toggle checkboxes
- `Enter`: Activate buttons
- `Escape`: Close filter panel

### Screen Reader Announcements
- "Permission selected" when checkbox checked
- "Permission deselected" when checkbox unchecked
- "Sorted by name ascending" when column sorted
- "3 permissions selected" when bulk selecting
- "Filter panel expanded" when filters shown

### Focus Indicators
- Blue ring around focused elements
- 2px offset for visibility
- Visible on all interactive elements

## Animation & Transitions

### Hover Effects
- Background color change (150ms ease)
- Scale slightly on buttons (transform: scale(1.02))
- Smooth color transitions

### Loading Skeleton
- Pulse animation (2s infinite)
- Gray gradient shimmer effect

### Filter Panel
- Slide down animation (200ms ease-out)
- Fade in opacity (200ms)

### Bulk Toolbar
- Slide down from top (200ms ease-out)
- Background color transition

## Best Practices

### Performance
- Virtualize for >1000 items
- Debounce search input
- Memoize filter calculations
- Use React.memo for rows

### UX
- Confirm destructive actions
- Show loading states
- Provide clear feedback
- Disable during operations
- Show error messages

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard support
- Focus management
- Color contrast

### Code Quality
- TypeScript for type safety
- Prop validation
- Error boundaries
- Unit tests
- Documentation
