#!/usr/bin/env python3
"""
Fix selectinload patterns for portfolio and line_manager relationships.
Since these now reference Employee instead of User, we need to update the nested selectinload calls.
"""

import re
import sys

def fix_file(filepath):
    """Fix selectinload patterns in a file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern 1: Fix User.portfolio selectinload with nested User attributes
    # Replace selectinload(User.portfolio).options(...User attributes...) with Employee attributes
    pattern1 = r'selectinload\(User\.portfolio\)\.options\(\s*selectinload\(User\.department\),\s*selectinload\(User\.branch\),\s*selectinload\(User\.position\)\.options\(\s*selectinload\(Position\.users\)\s*\),\s*selectinload\(User\.portfolio\),\s*selectinload\(User\.line_manager\),\s*selectinload\(User\.status_changed_by_user\),?\s*\)'
    replacement1 = 'selectinload(User.portfolio).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
    
    content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE)
    
    # Pattern 2: Fix User.line_manager selectinload with nested User attributes
    pattern2 = r'selectinload\(User\.line_manager\)\.options\(\s*selectinload\(User\.department\),\s*selectinload\(User\.branch\),\s*selectinload\(User\.position\)\.options\(\s*selectinload\(Position\.users\)\s*\),\s*selectinload\(User\.portfolio\),\s*selectinload\(User\.line_manager\),\s*selectinload\(User\.status_changed_by_user\),?\s*\)'
    replacement2 = 'selectinload(User.line_manager).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
    
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE)
    
    # Pattern 3: Simpler nested portfolio/line_manager patterns
    pattern3 = r'selectinload\(User\.portfolio\)\.options\(\s*selectinload\(User\.department\),\s*selectinload\(User\.branch\),\s*selectinload\(User\.portfolio\),\s*selectinload\(User\.line_manager\)\s*\)'
    replacement3 = 'selectinload(User.portfolio).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
    
    content = re.sub(pattern3, replacement3, content, flags=re.MULTILINE)
    
    pattern4 = r'selectinload\(User\.line_manager\)\.options\(\s*selectinload\(User\.department\),\s*selectinload\(User\.branch\),\s*selectinload\(User\.portfolio\),\s*selectinload\(User\.line_manager\)\s*\)'
    replacement4 = 'selectinload(User.line_manager).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
    
    content = re.sub(pattern4, replacement4, content, flags=re.MULTILINE)
    
    # Check if Employee import is needed and add it
    if 'selectinload(Employee.' in content and 'from app.models import' in content:
        # Check if Employee is already imported
        if not re.search(r'from app\.models import.*Employee', content):
            # Add Employee to the import
            content = re.sub(
                r'(from app\.models import [^)\n]+)',
                r'\1, Employee',
                content
            )
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
        return True
    else:
        print(f"No changes needed in {filepath}")
        return False

if __name__ == '__main__':
    files = [
        'app/routers/users.py',
        'app/routers/users/repositories/__init__.py',
        'app/routers/users/repositories/user_repository.py',
        'app/routers/users/services/user_query_service.py',
    ]
    
    fixed_count = 0
    for filepath in files:
        try:
            if fix_file(filepath):
                fixed_count += 1
        except Exception as e:
            print(f"Error fixing {filepath}: {e}")
    
    print(f"\nFixed {fixed_count} files")
