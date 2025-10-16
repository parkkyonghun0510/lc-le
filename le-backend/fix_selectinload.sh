#!/bin/bash

# Files to fix
files=(
    "app/routers/users.py"
    "app/routers/users/repositories/__init__.py"
    "app/routers/users/repositories/user_repository.py"
    "app/routers/users/services/user_query_service.py"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # Create a backup
        cp "$file" "$file.bak"
        
        # Use Python to do the replacement
        python3 << PYTHON
import re

with open('$file', 'r') as f:
    content = f.read()

# Replace patterns where User.portfolio/line_manager options try to load User attributes
# These should load Employee attributes instead

# Pattern: selectinload(User.portfolio).options with User attributes
content = re.sub(
    r'selectinload\(User\.portfolio\)\.options\([^)]*selectinload\(User\.(position|department|branch|portfolio|line_manager|status_changed_by_user)[^)]*\)',
    lambda m: 'selectinload(User.portfolio).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )',
    content,
    flags=re.DOTALL
)

# Pattern: selectinload(User.line_manager).options with User attributes  
content = re.sub(
    r'selectinload\(User\.line_manager\)\.options\([^)]*selectinload\(User\.(position|department|branch|portfolio|line_manager|status_changed_by_user)[^)]*\)',
    lambda m: 'selectinload(User.line_manager).options(\n                selectinload(Employee.department),\n                selectinload(Employee.branch),\n            )',
    content,
    flags=re.DOTALL
)

with open('$file', 'w') as f:
    f.write(content)

print(f"Fixed {file}")
PYTHON
    fi
done

echo "Done!"
