# Backend 503 Error Fix - Duplicate Folder Issue

## 🚨 **Root Cause Identified**

The 503 Service Unavailable error is caused by a **database constraint violation** in the folder service. The error message "Multiple rows were found when one or none was required" indicates that there are **duplicate parent folders** for the same application.

## 📊 **Error Analysis**

### **Error Location:**
```python
# In le-backend/app/services/folder_service.py
parent_folder = parent_folder_q.scalar_one_or_none()  # ❌ Fails when multiple rows exist
```

### **SQL Query That's Failing:**
```sql
SELECT folders.id, folders.name, folders.parent_id, folders.application_id, folders.created_at, folders.updated_at 
FROM folders 
WHERE folders.application_id = $1::UUID AND folders.parent_id IS NULL
```

### **Why It's Failing:**
- The query expects 0 or 1 parent folder per application
- But multiple parent folders exist for the same application
- `scalar_one_or_none()` throws an exception when multiple rows are found

## 🔧 **Solution Applied**

### 1. **Fixed Folder Service Logic**

Updated `le-backend/app/services/folder_service.py` to handle duplicate parent folders:

```python
# OLD CODE (broken):
parent_folder = parent_folder_q.scalar_one_or_none()  # Fails with multiple rows

# NEW CODE (fixed):
parent_folders = parent_folder_q.scalars().all()  # Get all parent folders

if parent_folders:
    # Use the first parent folder and clean up duplicates
    parent_folder = parent_folders[0]
    
    # Clean up duplicate parent folders
    if len(parent_folders) > 1:
        # Consolidate child folders and files
        # Remove duplicate parent folders
```

### 2. **Duplicate Cleanup Logic**

The fixed code now:
- ✅ Identifies duplicate parent folders
- ✅ Consolidates child folders (merges duplicates with same name)
- ✅ Moves files from duplicate folders to consolidated folders
- ✅ Removes duplicate parent folders
- ✅ Maintains data integrity

### 3. **Database Cleanup Scripts**

Created two cleanup options:

#### **Option A: Python Script**
```bash
cd le-backend
python cleanup_duplicate_folders.py
```

#### **Option B: SQL Script**
```bash
psql -d your_database -f cleanup_duplicate_folders.sql
```

## 🧪 **Testing the Fix**

### 1. **Verify Current State**
```sql
-- Check for applications with multiple parent folders
SELECT 
    application_id,
    COUNT(*) as parent_folder_count
FROM folders 
WHERE parent_id IS NULL 
GROUP BY application_id 
HAVING COUNT(*) > 1;
```

### 2. **Test File Upload**
After applying the fix, file uploads should work without 503 errors:

```bash
curl -X POST "https://your-backend/api/v1/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -F "application_id=test-app-id"
```

Expected response:
```json
{
  "id": "file-123",
  "folder_id": "folder-456",
  "application_id": "test-app-id",
  "filename": "test.jpg"
}
```

## 📋 **Deployment Steps**

### 1. **Apply Code Changes**
```bash
# Deploy the updated folder_service.py
git add le-backend/app/services/folder_service.py
git commit -m "Fix duplicate parent folder handling in folder service"
git push
```

### 2. **Run Database Cleanup**
```bash
# Option A: Python script
cd le-backend
python cleanup_duplicate_folders.py

# Option B: SQL script (with database backup first!)
pg_dump your_database > backup_before_cleanup.sql
psql -d your_database -f cleanup_duplicate_folders.sql
```

### 3. **Verify Fix**
```bash
# Test file upload
curl -X POST "https://your-backend/api/v1/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -F "application_id=existing-app-id"

# Should return 200 OK instead of 503
```

## 🎯 **Expected Results**

After applying the fix:

### ✅ **Before Fix (Broken):**
```
❌ 503 Service Unavailable
❌ Database error: Multiple rows were found when one or none was required
❌ File uploads fail
❌ Folder organization broken
```

### ✅ **After Fix (Working):**
```
✅ 200 OK responses
✅ Files upload successfully
✅ Folder organization works
✅ No duplicate parent folders
✅ Data integrity maintained
```

## 🔍 **Root Cause Prevention**

### **Why Duplicates Occurred:**
1. **Race Conditions:** Multiple simultaneous requests creating folders
2. **Retry Logic:** Failed requests being retried and creating duplicates
3. **Migration Issues:** Database migrations creating duplicate structures
4. **Concurrent Access:** Multiple users accessing same application simultaneously

### **Prevention Measures:**
1. **Database Constraints:** Add unique constraints to prevent duplicates
2. **Atomic Operations:** Use database transactions properly
3. **Idempotent Operations:** Make folder creation idempotent
4. **Better Error Handling:** Handle concurrent access gracefully

### **Recommended Database Constraint:**
```sql
-- Add unique constraint to prevent duplicate parent folders
ALTER TABLE folders 
ADD CONSTRAINT unique_application_parent_folder 
UNIQUE (application_id) 
WHERE parent_id IS NULL;
```

## 📞 **Next Steps**

### **Immediate (Required):**
1. ✅ Deploy the fixed folder service code
2. ✅ Run database cleanup script
3. ✅ Test file uploads
4. ✅ Verify 503 errors are resolved

### **Short Term (Recommended):**
1. Add database constraints to prevent future duplicates
2. Improve error handling in folder creation
3. Add monitoring for folder-related errors
4. Update API documentation

### **Long Term (Nice to Have):**
1. Implement proper concurrency handling
2. Add automated cleanup jobs
3. Improve folder management UI
4. Add bulk folder operations

## 🎉 **Success Criteria**

The fix is successful when:
- ✅ File uploads return 200 OK (not 503)
- ✅ No "Multiple rows were found" errors in logs
- ✅ Folder organization works in frontend
- ✅ Database has no duplicate parent folders
- ✅ All existing files remain accessible

**This fix resolves the immediate 503 error while maintaining data integrity and improving the folder management system's robustness.**