#!/usr/bin/env python3
"""
Fix portfolio and line_manager handling in users.py to use EmployeeSummary instead of User fields
"""

import re

# Read the file
with open('app/routers/users.py', 'r') as f:
    content = f.content()

# Pattern to match the old portfolio/line_manager handling
old_pattern = r'''    # Handle portfolio and line_manager relationships
    if user_data\.get\("portfolio"\):
        user_data\["portfolio"\] = \{
            "id": user_data\["portfolio"\]\.id,
            "username": user_data\["portfolio"\]\.username,
            "email": user_data\["portfolio"\]\.email,
            "first_name": user_data\["portfolio"\]\.first_name,
            "last_name": user_data\["portfolio"\]\.last_name,
            "phone_number": user_data\["portfolio"\]\.phone_number,
            "role": user_data\["portfolio"\]\.role,
            "status": user_data\["portfolio"\]\.status,
            "status_reason": user_data\["portfolio"\]\.status_reason,
            "status_changed_at": user_data\["portfolio"\]\.status_changed_at,
            "status_changed_by": user_data\["portfolio"\]\.status_changed_by,
            "last_activity_at": user_data\["portfolio"\]\.last_activity_at,
            "login_count": user_data\["portfolio"\]\.login_count,
            "failed_login_attempts": user_data\["portfolio"\]\.failed_login_attempts,
            "onboarding_completed": user_data\["portfolio"\]\.onboarding_completed,
            "onboarding_completed_at": user_data\["portfolio"\]\.onboarding_completed_at,
            "department_id": user_data\["portfolio"\]\.department_id,
            "branch_id": user_data\["portfolio"\]\.branch_id,
            "position_id": user_data\["portfolio"\]\.position_id,
            "portfolio_id": user_data\["portfolio"\]\.portfolio_id,
            "line_manager_id": user_data\["portfolio"\]\.line_manager_id,
            "profile_image_url": user_data\["portfolio"\]\.profile_image_url,
            "employee_id": user_data\["portfolio"\]\.employee_id,
            "created_at": user_data\["portfolio"\]\.created_at,
            "updated_at": user_data\["portfolio"\]\.updated_at,
            "last_login_at": user_data\["portfolio"\]\.last_login_at,
            "department": None,  # Avoid infinite nesting
            "branch": None,      # Avoid infinite nesting
            "position": None,    # Avoid infinite nesting
            "portfolio": None,   # Avoid infinite nesting
            "line_manager": None, # Avoid infinite nesting
            "status_changed_by_user": None
        \} if hasattr\(user_data\["portfolio"\], 'id'\) else None

    if user_data\.get\("line_manager"\):
        user_data\["line_manager"\] = \{
            "id": user_data\["line_manager"\]\.id,
            "username": user_data\["line_manager"\]\.username,
            "email": user_data\["line_manager"\]\.email,
            "first_name": user_data\["line_manager"\]\.first_name,
            "last_name": user_data\["line_manager"\]\.last_name,
            "phone_number": user_data\["line_manager"\]\.phone_number,
            "role": user_data\["line_manager"\]\.role,
            "status": user_data\["line_manager"\]\.status,
            "status_reason": user_data\["line_manager"\]\.status_reason,
            "status_changed_at": user_data\["line_manager"\]\.status_changed_at,
            "status_changed_by": user_data\["line_manager"\]\.status_changed_by,
            "last_activity_at": user_data\["line_manager"\]\.last_activity_at,
            "login_count": user_data\["line_manager"\]\.login_count,
            "failed_login_attempts": user_data\["line_manager"\]\.failed_login_attempts,
            "onboarding_completed": user_data\["line_manager"\]\.onboarding_completed,
            "onboarding_completed_at": user_data\["line_manager"\]\.onboarding_completed_at,
            "department_id": user_data\["line_manager"\]\.department_id,
            "branch_id": user_data\["line_manager"\]\.branch_id,
            "position_id": user_data\["line_manager"\]\.position_id,
            "portfolio_id": user_data\["line_manager"\]\.portfolio_id,
            "line_manager_id": user_data\["line_manager"\]\.line_manager_id,
            "profile_image_url": user_data\["line_manager"\]\.profile_image_url,
            "employee_id": user_data\["line_manager"\]\.employee_id,
            "created_at": user_data\["line_manager"\]\.created_at,
            "updated_at": user_data\["line_manager"\]\.updated_at,
            "last_login_at": user_data\["line_manager"\]\.last_login_at,
            "department": None,  # Avoid infinite nesting
            "branch": None,      # Avoid infinite nesting
            "position": None,    # Avoid infinite nesting
            "portfolio": None,   # Avoid infinite nesting
            "line_manager": None, # Avoid infinite nesting
            "status_changed_by_user": None
        \} if hasattr\(user_data\["line_manager"\], 'id'\) else None'''

new_code = '''    # Handle portfolio and line_manager relationships (Employee objects)
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
        }) if hasattr(user_data["line_manager"], 'id') else None'''

# Replace all occurrences
content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE)

# Write back
with open('app/routers/users.py', 'w') as f:
    f.write(content)

print("Fixed all portfolio and line_manager handling in users.py")
