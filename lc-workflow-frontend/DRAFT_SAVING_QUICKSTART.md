# Draft Saving Quick Start Guide

## What is Draft Saving?

Draft saving automatically saves your form data to your browser's local storage, so you don't lose your work if you accidentally close the browser or navigate away.

## Where is it Available?

Currently implemented in:
- ✅ **Role Management** - Create Role form

Coming soon to:
- 📋 Permission creation/edit forms
- 📋 User management forms
- 📋 Other administrative forms

## How It Works

### Auto-Save
- Your form data is automatically saved every **30 seconds**
- No action required - it happens in the background
- Only saves when you're creating new items (not editing existing ones)

### Draft Restoration
- When you return to a form, your draft is automatically restored
- You'll see a notification showing how long ago the draft was saved
- Example: "Draft restored from 5 minutes ago"

### Unsaved Changes Warning
- If you try to close a form with unsaved changes, you'll see a confirmation dialog
- Options:
  - **Keep Editing** - Stay on the form and continue editing
  - **Discard Changes** - Close the form and lose your changes

### Automatic Cleanup
- Drafts older than **7 days** are automatically deleted
- Keeps your browser storage clean
- No manual cleanup needed

## User Guide

### Creating a New Role

1. **Open the form**
   - Click "Create Role" button
   - If you have a saved draft, it will be restored automatically

2. **Fill out the form**
   - Enter role name, display name, description, etc.
   - Your data is auto-saved every 30 seconds

3. **If you need to leave**
   - Click "Cancel" or press Escape
   - If you have unsaved changes, you'll see a confirmation dialog
   - Choose "Keep Editing" to continue or "Discard Changes" to leave

4. **Submit the form**
   - Click "Create Role" button
   - Your draft is automatically cleared on successful submission

### Editing an Existing Role

1. **Open the form**
   - Click edit button on a role
   - Form opens with existing role data

2. **Make changes**
   - Edit any fields as needed
   - Changes are tracked but not auto-saved (to avoid confusion)

3. **If you need to leave**
   - Click "Cancel" or press Escape
   - If you have unsaved changes, you'll see a confirmation dialog

4. **Submit the form**
   - Click "Update Role" button
   - Form closes on successful submission

## Tips & Tricks

### Keyboard Shortcuts
- **Escape** - Close form (with unsaved changes check)
- **Tab** - Navigate between form fields
- **Enter** - Submit form (when focused on a button)

### Best Practices
1. **Don't rely solely on auto-save** - Submit your form when done
2. **Check for draft notification** - If you see "Draft restored", review the data
3. **Use meaningful names** - Helps identify drafts if you have multiple
4. **Submit regularly** - Don't leave drafts for days

### Troubleshooting

**Q: My draft wasn't restored**
- Check if it's been more than 7 days (drafts expire)
- Verify you're on the same browser and device
- Check if you cleared your browser data

**Q: I don't want to restore the draft**
- Just clear the form fields and start fresh
- The old draft will be overwritten when you save

**Q: Can I see all my saved drafts?**
- Currently, drafts are restored automatically
- Future versions may include a draft list view

**Q: Is my data secure?**
- Drafts are stored locally in your browser
- They're not sent to the server until you submit
- Don't store sensitive information in drafts

**Q: Can I access drafts from another device?**
- No, drafts are stored locally in your browser
- They're not synced across devices
- Future versions may include cloud sync

## Privacy & Security

### What's Stored
- Form field values (name, description, etc.)
- Timestamp of when draft was saved
- Form type identifier

### What's NOT Stored
- Passwords or sensitive credentials
- Server responses
- User authentication tokens

### Storage Location
- Browser's localStorage (local to your device)
- Not sent to server
- Cleared when you clear browser data

### Data Retention
- Drafts expire after 7 days
- Automatically cleaned up
- Can be manually cleared by clearing browser data

## For Developers

Want to add draft saving to your form? See:
- `lc-workflow-frontend/src/hooks/DRAFT_SAVING_GUIDE.md` - Complete developer guide
- `lc-workflow-frontend/src/components/permissions/DRAFT_SAVING_TEMPLATE.tsx` - Code template
- `lc-workflow-frontend/TASK_18_DRAFT_SAVING_IMPLEMENTATION.md` - Implementation details

## Feedback

Have suggestions or issues with draft saving?
- Report bugs to your development team
- Suggest improvements for auto-save interval
- Request draft saving for other forms

## Version History

### v1.0 (October 17, 2025)
- ✅ Initial implementation
- ✅ Role Management form support
- ✅ Auto-save every 30 seconds
- ✅ Draft restoration with notification
- ✅ Unsaved changes confirmation
- ✅ Automatic cleanup after 7 days

### Coming Soon
- 📋 Permission form support
- 📋 Draft list view
- 📋 Manual save button
- 📋 Cloud sync across devices
- 📋 Draft versioning
