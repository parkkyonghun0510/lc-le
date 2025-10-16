#!/usr/bin/env python3
"""Fix portfolio and line_manager handling in users.py"""

# Read the file
with open('le-backend/app/routers/users.py', 'r') as f:
    lines = f.readlines()

# Find and replace the portfolio/line_manager handling blocks
i = 0
while i < len(lines):
    # Look for the comment line
    if '# Handle portfolio and line_manager relationships' in lines[i]:
        # Find the end of this block (look for the next non-indented line or specific pattern)
        start = i
        # Skip to the end of line_manager handling
        while i < len(lines) and not (i > start + 100):  # Safety limit
            i += 1
            # Look for the end pattern
            if i < len(lines) and 'if hasattr(user_data["line_manager"]' in lines[i]:
                # Find the closing of this if statement
                while i < len(lines) and '} if hasattr(user_data["line_manager"]' not in lines[i]:
                    i += 1
                i += 1  # Include the closing line
                break
        
        # Replace the entire block
        new_block = '''    # Handle portfolio and line_manager relationships (Employee objects)
    if user_data.get("portfolio"):
        user_data["portfolio"] = EmployeeSummary.model_validate({
            "id": user_data["portfolio"].id,
            "employee_code": user_data["portfolio"].employee_code,
            "full_name_khmer": user_data["portfolio"].full_name_khmer,
            "full_name_latin": user_data["portfolio"].full_name_latin,
            "position": user_data["portfolio"].position,
            "is_active": user_data["portfolio"].is_active,
        }) if hasattr(user_data["portfolio"], 'id') else None

    if user_data.get("line_manager"):
        user_data["line_manager"] = EmployeeSummary.model_validate({
            "id": user_data["line_manager"].id,
            "employee_code": user_data["line_manager"].employee_code,
            "full_name_khmer": user_data["line_manager"].full_name_khmer,
            "full_name_latin": user_data["line_manager"].full_name_latin,
            "position": user_data["line_manager"].position,
            "is_active": user_data["line_manager"].is_active,
        }) if hasattr(user_data["line_manager"], 'id') else None

'''
        lines[start:i] = [new_block]
        i = start + 1
    else:
        i += 1

# Write back
with open('le-backend/app/routers/users.py', 'w') as f:
    f.writelines(lines)

print("Fixed all occurrences")
