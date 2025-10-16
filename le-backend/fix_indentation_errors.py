#!/usr/bin/env python3
"""Fix indentation errors in users.py caused by malformed selectinload patterns"""

import re

filepath = "app/routers/users.py"

with open(filepath, 'r') as f:
    content = f.read()

# Pattern to match the malformed selectinload structure
# This matches: portfolio.options(...), orphaned selectinloads ), line_manager.options(...), orphaned selectinloads )
pattern = r'''selectinload\(User\.portfolio\)\.options\(
\s+selectinload\(Employee\.department\),
\s+selectinload\(Employee\.branch\),
\s+\),
\s+selectinload\(User\.department\),
\s+selectinload\(User\.branch\),
\s+selectinload\(User\.portfolio\),
\s+selectinload\(User\.line_manager\)
\s+\),
\s+selectinload\(User\.line_manager\)\.options\(
\s+selectinload\(Employee\.department\),
\s+selectinload\(Employee\.branch\),
\s+\),
\s+selectinload\(User\.department\),
\s+selectinload\(User\.branch\),
\s+selectinload\(User\.portfolio\),
\s+selectinload\(User\.line_manager\)
\s+\),'''

replacement = '''selectinload(User.portfolio).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),
            selectinload(User.line_manager).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),'''

content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

with open(filepath, 'w') as f:
    f.write(content)

print(f"Fixed {filepath}")
