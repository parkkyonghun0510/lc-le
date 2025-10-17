# Audit Trail - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. View Audit Trail

Navigate to the Permissions page and click the "Audit Trail" tab:

```
/permissions → Audit Trail tab
```

You'll see all permission-related changes in chronological order.

### 2. Filter Audit Entries

Click the "Filters" button to show the filter panel:

- **Action Type**: Filter by specific actions (e.g., "Role Assigned")
- **Entity Type**: Filter by entity (e.g., "User Role")
- **Search**: Free text search in details
- **Date Range**: Filter by start and end dates

Click "Apply Filters" to see filtered results.

### 3. Export to CSV

Click the "Export CSV" button to download all filtered entries as a CSV file. Perfect for:
- Compliance reports
- Security audits
- Historical analysis

### 4. Real-Time Updates

The audit trail automatically refreshes every 30 seconds. You can also click "Refresh" to manually update.

## 📊 What Gets Logged?

### Permission Actions
- ✅ Permission Created
- ✅ Permission Updated
- ✅ Permission Deleted
- ✅ Permission Toggled (activated/deactivated)

### Role Actions
- ✅ Role Created
- ✅ Role Updated
- ✅ Role Deleted
- ✅ Role Assigned to User
- ✅ Role Revoked from User

### User Permission Actions
- ✅ Permission Granted to User
- ✅ Permission Revoked from User

### Role Permission Actions
- ✅ Permission Added to Role
- ✅ Permission Removed from Role

## 🎨 Understanding the UI

### Color-Coded Badges
- 🟢 **Green** - Grants, assignments, creations
- 🔴 **Red** - Revocations, deletions
- 🔵 **Blue** - Updates, toggles

### Entry Information
Each entry shows:
- **Action** - What happened
- **Target** - Who was affected (if applicable)
- **Permission/Role** - What permission or role
- **Reason** - Why it happened (if provided)
- **Performed By** - Who did it
- **Timestamp** - When it happened
- **IP Address** - Where it came from

## 🔍 Common Use Cases

### 1. Track Role Assignments
Filter by action type "Role Assigned" to see all role assignments:

```
Filters → Action Type: Role Assigned → Apply
```

### 2. Monitor Permission Changes
Filter by entity type "Permission" to see all permission changes:

```
Filters → Entity Type: Permission → Apply
```

### 3. Audit User Access
Search for a specific user to see all changes affecting them:

```
Filters → Search: "John Doe" → Apply
```

### 4. Generate Compliance Report
Export filtered entries for a specific date range:

```
Filters → Start Date: 2025-10-01 → End Date: 2025-10-17 → Apply
Export CSV
```

## 🔐 Security & Permissions

### Required Permission
You need the `AUDIT:VIEW_ALL` permission to view the audit trail.

### What's NOT Logged
- ❌ Passwords
- ❌ Authentication tokens
- ❌ Sensitive user data
- ❌ Internal system IDs (except for reference)

## 💡 Pro Tips

### Tip 1: Use Date Ranges
For large audit trails, use date ranges to narrow down results:

```
Start Date: 2025-10-01
End Date: 2025-10-17
```

### Tip 2: Combine Filters
Combine multiple filters for precise results:

```
Action Type: Role Assigned
Entity Type: User Role
Start Date: 2025-10-01
```

### Tip 3: Export Regularly
Export audit trails regularly for backup and compliance:

```
Export CSV → Save to secure location
```

### Tip 4: Monitor Real-Time
Keep the audit trail open to monitor changes in real-time (auto-refreshes every 30 seconds).

## 🐛 Troubleshooting

### No Entries Showing?
1. Check your filters - they might be too restrictive
2. Verify you have the `AUDIT:VIEW_ALL` permission
3. Check the date range - it might be outside the audit period

### Export Not Working?
1. Check browser console for errors
2. Verify there are entries to export
3. Check browser's download settings
4. Disable popup blockers

### Real-Time Updates Not Working?
1. Check network connectivity
2. Verify the backend is running
3. Check browser console for errors
4. Try manual refresh

## 📚 Learn More

- [Full Audit Trail Guide](./AUDIT_TRAIL_GUIDE.md) - Comprehensive documentation
- [Implementation Summary](./TASK_21_IMPLEMENTATION_SUMMARY.md) - Technical details
- [Permission Management](./README.md) - Overall system documentation

## 🎯 Next Steps

1. ✅ View the audit trail
2. ✅ Try filtering by different criteria
3. ✅ Export a sample CSV
4. ✅ Set up regular exports for compliance
5. ✅ Monitor for unusual activity

---

**Need Help?** Check the [Full Audit Trail Guide](./AUDIT_TRAIL_GUIDE.md) for detailed information.
