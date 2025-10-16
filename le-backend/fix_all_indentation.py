#!/usr/bin/env python3
"""Fix indentation errors in all affected files"""

import re

files = [
    "app/routers/users/repositories/__init__.py",
    "app/routers/users/repositories/user_repository.py",
    "app/routers/users/services/user_query_service.py",
]

for filepath in files:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Pattern 1: Fix the malformed structure with orphaned selectinloads
        pattern1 = r'''selectinload\(User\.portfolio\)\.options\(
\s+selectinload\(Employee\.department\),
\s+selectinload\(Employee\.branch\),
\s+\),
\s+selectinload\(User\.department\),
\s+selectinload\(User\.branch\)
\s+\),
\s+selectinload\(User\.line_manager\)\.options\(
\s+selectinload\(Employee\.department\),
\s+selectinload\(Employee\.branch\),
\s+\),
\s+selectinload\(User\.department\),
\s+selectinload\(User\.branch\)
\s+\),'''
        
        replacement1 = '''selectinload(User.portfolio).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),
            selectinload(User.line_manager).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),'''
        
        content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed {filepath}")
        else:
            print(f"- No changes in {filepath}")
            
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
