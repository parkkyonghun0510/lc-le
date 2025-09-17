-- SQL script to clean up duplicate parent folders
-- This script identifies and helps clean up applications with multiple parent folders

-- Step 1: Identify applications with duplicate parent folders
SELECT 
    application_id,
    COUNT(*) as parent_folder_count,
    STRING_AGG(id::text, ', ') as folder_ids,
    STRING_AGG(name, ' | ') as folder_names
FROM folders 
WHERE parent_id IS NULL 
GROUP BY application_id 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Step 2: For each application with duplicates, show the details
WITH duplicate_apps AS (
    SELECT application_id
    FROM folders 
    WHERE parent_id IS NULL 
    GROUP BY application_id 
    HAVING COUNT(*) > 1
)
SELECT 
    f.application_id,
    f.id as folder_id,
    f.name as folder_name,
    f.created_at,
    (SELECT COUNT(*) FROM folders cf WHERE cf.parent_id = f.id) as child_folder_count,
    (SELECT COUNT(*) FROM files fi WHERE fi.folder_id = f.id) as direct_file_count
FROM folders f
JOIN duplicate_apps da ON f.application_id = da.application_id
WHERE f.parent_id IS NULL
ORDER BY f.application_id, f.created_at;

-- Step 3: Clean up script (run this after reviewing the above results)
-- WARNING: This will modify your data. Make sure to backup first!

-- Create a temporary table to track which folders to keep (oldest for each application)
CREATE TEMP TABLE folders_to_keep AS
SELECT DISTINCT ON (application_id) 
    application_id,
    id as keep_folder_id
FROM folders 
WHERE parent_id IS NULL 
ORDER BY application_id, created_at ASC;

-- Show what will be kept vs removed
SELECT 
    f.application_id,
    f.id as folder_id,
    f.name,
    f.created_at,
    CASE 
        WHEN ftk.keep_folder_id = f.id THEN 'KEEP' 
        ELSE 'REMOVE' 
    END as action
FROM folders f
LEFT JOIN folders_to_keep ftk ON f.application_id = ftk.application_id
WHERE f.parent_id IS NULL
ORDER BY f.application_id, f.created_at;

-- Uncomment the following sections to actually perform the cleanup:

/*
-- Step 4: Move child folders from duplicate parents to the main parent
UPDATE folders 
SET parent_id = ftk.keep_folder_id
FROM folders_to_keep ftk
WHERE folders.parent_id IN (
    SELECT f.id 
    FROM folders f
    LEFT JOIN folders_to_keep ftk2 ON f.application_id = ftk2.application_id
    WHERE f.parent_id IS NULL 
    AND f.id != ftk2.keep_folder_id
    AND f.application_id = ftk.application_id
);

-- Step 5: Move files from duplicate parent folders to the main parent
UPDATE files 
SET folder_id = ftk.keep_folder_id
FROM folders_to_keep ftk
WHERE files.folder_id IN (
    SELECT f.id 
    FROM folders f
    LEFT JOIN folders_to_keep ftk2 ON f.application_id = ftk2.application_id
    WHERE f.parent_id IS NULL 
    AND f.id != ftk2.keep_folder_id
    AND f.application_id = ftk.application_id
);

-- Step 6: Handle duplicate child folders (merge files from duplicates)
-- This is more complex and should be done carefully
WITH duplicate_children AS (
    SELECT 
        application_id,
        parent_id,
        name,
        COUNT(*) as count,
        MIN(id) as keep_id,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM folders 
    WHERE parent_id IS NOT NULL
    GROUP BY application_id, parent_id, name
    HAVING COUNT(*) > 1
)
UPDATE files 
SET folder_id = dc.keep_id
FROM duplicate_children dc
WHERE files.folder_id = ANY(dc.all_ids[2:]);

-- Step 7: Delete duplicate child folders
WITH duplicate_children AS (
    SELECT 
        application_id,
        parent_id,
        name,
        COUNT(*) as count,
        MIN(id) as keep_id,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM folders 
    WHERE parent_id IS NOT NULL
    GROUP BY application_id, parent_id, name
    HAVING COUNT(*) > 1
)
DELETE FROM folders 
WHERE id IN (
    SELECT UNNEST(all_ids[2:]) 
    FROM duplicate_children
);

-- Step 8: Delete duplicate parent folders
DELETE FROM folders 
WHERE parent_id IS NULL 
AND id NOT IN (SELECT keep_folder_id FROM folders_to_keep);

-- Step 9: Verify cleanup
SELECT 
    application_id,
    COUNT(*) as parent_folder_count
FROM folders 
WHERE parent_id IS NULL 
GROUP BY application_id 
HAVING COUNT(*) > 1;
*/

-- If the above query returns no results, the cleanup was successful!