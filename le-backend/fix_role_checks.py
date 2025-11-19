#!/usr/bin/env python3
"""
Script to fix indentation errors caused by incomplete role checks.

This script finds and removes lines like:
    if current_user.role not in ["admin", "manager"]:
    
that are followed by commented-out permission checks and uncommented code.
"""

import re
import sys
from pathlib import Path

def fix_incomplete_role_checks(file_path):
    """Fix incomplete role check patterns in a Python file."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    modified = False
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is an incomplete role check pattern
        if re.match(r'^\s+if current_user\.role', line):
            # Look ahead to see if next lines are commented
            lookahead = 1
            all_commented = True
            
            while i + lookahead < len(lines):
                next_line = lines[i + lookahead]
                # If it's a comment starting with #, continue
                if re.match(r'^\s+#', next_line):
                    lookahead += 1
                # If it's an empty line, continue
                elif next_line.strip() == '':
                    lookahead += 1
                # If it's actual code, check if it's indented
                else:
                    # This is actual code - if it's not indented relative to the if,
                    # then the if is incomplete
                    if_indent = len(line) - len(line.lstrip())
                    code_indent = len(next_line) - len(next_line.lstrip())
                    
                    # If code is not more indented than the if, skip the if and comments
                    if code_indent <= if_indent:
                        print(f"  Removing incomplete role check at line {i + 1}")
                        modified = True
                        # Skip this if line and any following comments/empty lines
                        i += lookahead
                        continue
                    break
        
        new_lines.append(line)
        i += 1
    
    if modified:
        with open(file_path, 'w') as f:
            f.writelines(new_lines)
        return True
    return False

def main():
    """Main function to process all router files."""
    routers_dir = Path('app/routers')
    
    if not routers_dir.exists():
        print("Error: app/routers directory not found")
        sys.exit(1)
    
    files_to_check = [
        'settings.py',
        'performance.py', 
        'departments_enhanced.py',
    ]
    
    fixed_count = 0
    
    for filename in files_to_check:
        file_path = routers_dir / filename
        if file_path.exists():
            print(f"Processing {filename}...")
            if fix_incomplete_role_checks(file_path):
                fixed_count += 1
                print(f"  ✓ Fixed {filename}")
            else:
                print(f"  - No changes needed in {filename}")
        else:
            print(f"  ! {filename} not found")
    
    print(f"\n✓ Fixed {fixed_count} file(s)")

if __name__ == '__main__':
    main()
