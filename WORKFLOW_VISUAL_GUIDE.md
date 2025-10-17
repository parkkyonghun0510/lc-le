# Workflow System - Visual Guide

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION DETAIL PAGE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────┬─────────────────────────────────┐ │
│  │ MAIN CONTENT (2/3)          │ SIDEBAR (1/3)                   │ │
│  │                             │                                 │ │
│  │ ┌─────────────────────────┐ │ ┌─────────────────────────────┐ │ │
│  │ │ Customer Information    │ │ │ 📊 Status Card              │ │ │
│  │ └─────────────────────────┘ │ │ │ • Application ID          │ │ │
│  │                             │ │ │ • Status Badge            │ │ │
│  │ ┌─────────────────────────┐ │ │ │ • Document Count          │ │ │
│  │ │ Loan Details            │ │ │ └─────────────────────────────┘ │ │
│  │ └─────────────────────────┘ │ │                                 │ │
│  │                             │ │ ┌─────────────────────────────┐ │ │
│  │ ┌─────────────────────────┐ │ │ │ ⏰ Workflow Timeline        │ │ │
│  │ │ Demographics & Account  │ │ │ │                             │ │ │
│  │ └─────────────────────────┘ │ │ │ Priority: [NORMAL]          │ │ │
│  │                             │ │ │ Status: USER_COMPLETED      │ │ │
│  │ ┌─────────────────────────┐ │ │ │                             │ │ │
│  │ │ Financial Information   │ │ │ │ ✅ PO Created               │ │ │
│  │ └─────────────────────────┘ │ │ │ │  Oct 17, 2025             │ │ │
│  │                             │ │ │ ⏰ User Completed            │ │ │
│  │ ┌─────────────────────────┐ │ │ │ │  Oct 17, 2025             │ │ │
│  │ │ Risk Assessment         │ │ │ │ ⭕ Teller Processing         │ │ │
│  │ └─────────────────────────┘ │ │ │ │                           │ │ │
│  │                             │ │ │ ⭕ Manager Review            │ │ │
│  │ ┌─────────────────────────┐ │ │ │ │                           │ │ │
│  │ │ Additional Loan Details │ │ │ │ ⭕ Final Decision            │ │ │
│  │ └─────────────────────────┘ │ │ │                             │ │ │
│  │                             │ │ │ Legend:                     │ │ │
│  │ ┌─────────────────────────┐ │ │ │ ✅ Completed                │ │ │
│  │ │ Assigned Employees      │ │ │ │ ⏰ Current                  │ │ │
│  │ └─────────────────────────┘ │ │ │ ⭕ Pending                   │ │ │
│  │                             │ │ └─────────────────────────────┘ │ │
│  │ ┌─────────────────────────┐ │ │                                 │ │
│  │ │ Guarantor Information   │ │ │ ┌─────────────────────────────┐ │ │
│  │ └─────────────────────────┘ │ │ │ ✓ Workflow Actions          │ │ │
│  │                             │ │ │                             │ │ │
│  │ ┌─────────────────────────┐ │ │ │ [→ ដំណើរការ (Process)]     │ │ │
│  │ │ Documents               │ │ │ │                             │ │ │
│  │ └─────────────────────────┘ │ │ └─────────────────────────────┘ │ │
│  │                             │ │                                 │ │
│  └─────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Actions by Role

### 1. User (Application Owner) - Draft Status
```
┌─────────────────────────────────┐
│ ✓ Workflow Actions              │
├─────────────────────────────────┤
│                                 │
│ [📄 ដាក់ស្នើ (Submit)]          │
│                                 │
└─────────────────────────────────┘
```

### 2. Officer (Teller) - USER_COMPLETED Status
```
┌─────────────────────────────────┐
│ ✓ Workflow Actions              │
├─────────────────────────────────┤
│                                 │
│ [→ ដំណើរការ (Process)]          │
│                                 │
│ ↓ When clicked:                 │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📄 Teller Processing        │ │
│ │                             │ │
│ │ Account ID: *               │ │
│ │ [00012345            ]      │ │
│ │                             │ │
│ │ 👤 Assign Reviewer:         │ │
│ │ [សុខ សំណាង (E001)      ▼]  │ │
│ │ ℹ️ Assign a specific        │ │
│ │    manager/reviewer         │ │
│ │                             │ │
│ │ Notes:                      │ │
│ │ [Validated successfully  ]  │ │
│ │ [                        ]  │ │
│ │                             │ │
│ │ [✓ Submit] [Cancel]         │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### 3. Manager/Admin - MANAGER_REVIEW Status
```
┌─────────────────────────────────┐
│ ✓ Workflow Actions              │
├─────────────────────────────────┤
│                                 │
│ [✓ អនុម័ត (Approve)]            │
│                                 │
│ [✗ បដិសេធ (Reject)]             │
│                                 │
└─────────────────────────────────┘

When Reject clicked:
┌─────────────────────────────────┐
│ ❌ បដិសេធពាក្យសុំ                │
├─────────────────────────────────┤
│                                 │
│ មូលហេតុបដិសេធ *                 │
│ ┌─────────────────────────────┐ │
│ │ Enter rejection reason...   │ │
│ │                             │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│        [បោះបង់] [បដិសេធ]        │
│                                 │
└─────────────────────────────────┘
```

## Complete Workflow Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         WORKFLOW STAGES                          │
└──────────────────────────────────────────────────────────────────┘

Stage 1: DRAFT (PO_CREATED)
┌─────────────────────────────────┐
│ Created by Portfolio Officer    │
│ Status: Draft                   │
│ Timeline: ⭕ PO Created          │
└─────────────────────────────────┘
                ↓
        [User Submit Button]
                ↓
Stage 2: USER_COMPLETED
┌─────────────────────────────────┐
│ User filled all information     │
│ Status: Submitted               │
│ Timeline: ✅ PO Created          │
│          ✅ User Completed       │
│          ⏰ Teller Processing    │
└─────────────────────────────────┘
                ↓
    [Officer Process Button]
    + Account ID (required)
    + Assign Reviewer (optional)
    + Notes (optional)
                ↓
Stage 3: MANAGER_REVIEW
┌─────────────────────────────────┐
│ Teller validated & assigned     │
│ Status: Under Review            │
│ Timeline: ✅ PO Created          │
│          ✅ User Completed       │
│          ✅ Teller Processing    │
│          ⏰ Manager Review        │
└─────────────────────────────────┘
                ↓
    [Manager Approve/Reject]
                ↓
        ┌───────┴───────┐
        ↓               ↓
Stage 4a: APPROVED    Stage 4b: REJECTED
┌─────────────────┐   ┌─────────────────┐
│ Loan Approved   │   │ Loan Rejected   │
│ Status: ✅      │   │ Status: ❌      │
│ Timeline: All ✅│   │ Timeline: All ✅│
│ + Final: ✅     │   │ + Final: ❌     │
└─────────────────┘   └─────────────────┘
```

## Permission Matrix Visual

```
┌────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Workflow Stage │   User   │ Officer  │ Manager  │  Admin   │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Draft          │ ✅ Submit│    ❌    │    ❌    │    ❌    │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ USER_COMPLETED │    ❌    │✅ Process│    ❌    │    ❌    │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ MANAGER_REVIEW │    ❌    │    ❌    │✅ Approve│✅ Approve│
│                │          │          │✅ Reject │✅ Reject │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ APPROVED       │    ❌    │    ❌    │    ❌    │    ❌    │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ REJECTED       │    ❌    │    ❌    │    ❌    │    ❌    │
└────────────────┴──────────┴──────────┴──────────┴──────────┘
```

## Timeline States Visual

### Completed Step
```
✅ ─┬─ PO Created
    │  Oct 17, 2025 10:30 AM
    │
```

### Current Step (Animated)
```
⏰ ─┬─ User Completed
    │  Oct 17, 2025 11:45 AM
    │  (Pulsing animation)
```

### Pending Step
```
⭕ ─┬─ Teller Processing
    │  (Waiting...)
    │
```

### Rejected Step
```
❌ ─┬─ Rejected
    │  Oct 17, 2025 2:30 PM
    │  Reason: Insufficient docs
```

## Mobile View

```
┌─────────────────────────────────┐
│ APPLICATION DETAIL (Mobile)     │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Status Card                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Workflow Timeline           │ │
│ │ (Compact)                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Workflow Actions            │ │
│ │ (Full width buttons)        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Customer Information        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Loan Details                │ │
│ └─────────────────────────────┘ │
│                                 │
│ ... (rest of content)           │
│                                 │
└─────────────────────────────────┘
```

## Summary

The workflow system provides:
- ✅ **Visual Timeline**: Clear progression with icons and colors
- ✅ **Role-Based Actions**: Only show what user can do
- ✅ **Inline Forms**: No page navigation needed
- ✅ **Permission Enforcement**: Frontend + Backend validation
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **Bilingual**: Khmer + English throughout

**Status**: ✅ COMPLETE AND PRODUCTION READY
