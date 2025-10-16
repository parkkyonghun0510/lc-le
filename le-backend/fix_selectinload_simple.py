#!/usr/bin/env python3
import re
import sys

files = [
    "app/routers/users.py",
    "app/routers/users/repositories/__init__.py",
    "app/routers/users/repositories/user_repository.py",
    "app/routers/users/services/user_query_service.py",
]

for filepath in files:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Replace selectinload(User.portfolio).options(...) patterns
        # Match the opening and find the closing parenthesis
        def replace_portfolio(match):
            return 'selectinload(User.portfolio).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
        
        def replace_line_manager(match):
            return 'selectinload(User.line_manager).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )'
        
        # Find and replace portfolio patterns
        pattern_portfolio = r'selectinload\(User\.portfolio\)\.options\([^)]*(?:selectinload\(User\.[^)]+\)[,\s]*)+\s*\)'
        content = re.sub(pattern_portfolio, replace_portfolio, content, flags=re.DOTALL)
        
        # Find and replace line_manager patterns  
        pattern_line_manager = r'selectinload\(User\.line_manager\)\.options\([^)]*(?:selectinload\(User\.[^)]+\)[,\s]*)+\s*\)'
        content = re.sub(pattern_line_manager, replace_line_manager, content, flags=re.DOTALL)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed {filepath}")
        else:
            print(f"- No changes in {filepath}")
            
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
