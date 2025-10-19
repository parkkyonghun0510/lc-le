# Standard Roles Reference Guide

## Overview
This document provides a quick reference for the 7 standard roles in the LC Workflow system, including their hierarchy levels, descriptions, and assigned permissions.

## Role Hierarchy

```
Level 100: Admin (Full System Access)
Level 80:  Branch Manager (Branch-level Management)
Level 70:  Reviewer/Auditor (Read-only + Export)
Level 60:  Credit Officer (Department-level Management)
Level 50:  Portfolio Officer (Portfolio Management)
Level 40:  Teller (Application Processing)
Level 30:  Data Entry Clerk (Basic Data Entry)
```

## Role Details

### 1. Admin (Level 100)
**Role Name:** `admin`
**Display Name:** Administrator
**Permissions:** 52

**Description:**
Full system access with all permissions. Can manage users, roles, and system settings.

**Key Capabilities:**
- All permissions with GLOBAL scope
- User and role management
- System configuration
- Full audit trail access
- All resource management

**Typical Use Cases:**
- System administrators
- IT staff
- Super users

---

### 2. Branch Manager (Level 80)
**Role Name:** `branch_manager`
**Display Name:** Branch Manager
**Permissions:** 21

**Description:**
Branch-level management. Can approve/reject applications, manage branch users, and view branch analytics.

**Key Permissions:**
- `APPLICATION.APPROVE.BRANCH`
- `APPLICATION.REJECT.BRANCH`
- `APPLICATION.VIEW_ALL.BRANCH`
- `APPLICATION.READ.BRANCH`
- `APPLICATION.UPDATE.BRANCH`
- `APPLICATION.ASSIGN.BRANCH`
- `APPLICATION.EXPORT.BRANCH`
- `USER.READ.BRANCH`
- `USER.UPDATE.BRANCH`
- `USER.ASSIGN.BRANCH`
- `ANALYTICS.VIEW_ALL.BRANCH`
- `ANALYTICS.READ.BRANCH`
- `ANALYTICS.EXPORT.BRANCH`
- `DEPARTMENT.READ.BRANCH`
- `DEPARTMENT.MANAGE.BRANCH`
- `FILE.READ.BRANCH`
- `FILE.UPDATE.BRANCH`
- `FOLDER.READ.BRANCH`
- `FOLDER.MANAGE.BRANCH`
- `AUDIT.READ.BRANCH`
- `AUDIT.EXPORT.BRANCH`

**Typical Use Cases:**
- Branch managers
- Regional managers
- Branch supervisors

---

### 3. Reviewer/Auditor (Level 70)
**Role Name:** `reviewer`
**Display Name:** Reviewer/Auditor
**Permissions:** 15

**Description:**
Read-only access with export capabilities. Can view all applications, audit trails, and export reports for compliance.

**Key Permissions:**
- `APPLICATION.READ.GLOBAL`
- `APPLICATION.VIEW_ALL.GLOBAL`
- `APPLICATION.EXPORT.GLOBAL`
- `AUDIT.READ.GLOBAL`
- `AUDIT.VIEW_ALL.GLOBAL`
- `AUDIT.EXPORT.GLOBAL`
- `ANALYTICS.VIEW_ALL.GLOBAL`
- `ANALYTICS.READ.GLOBAL`
- `ANALYTICS.EXPORT.GLOBAL`
- `USER.READ.GLOBAL`
- `DEPARTMENT.READ.GLOBAL`
- `BRANCH.READ.GLOBAL`
- `FILE.READ.GLOBAL`
- `FILE.EXPORT.GLOBAL`
- `FOLDER.READ.GLOBAL`

**Key Restrictions:**
- No CREATE, UPDATE, or DELETE permissions
- No APPROVE or REJECT permissions
- Read-only access only

**Typical Use Cases:**
- Internal auditors
- Compliance officers
- External auditors
- Quality assurance staff

---

### 4. Credit Officer (Level 60)
**Role Name:** `credit_officer`
**Display Name:** Credit Officer
**Permissions:** 26

**Description:**
Department-level application management. Can create, update, and manage applications within their department.

**Key Permissions:**
- `APPLICATION.CREATE.DEPARTMENT`
- `APPLICATION.READ.DEPARTMENT`
- `APPLICATION.UPDATE.DEPARTMENT`
- `APPLICATION.ASSIGN.DEPARTMENT`
- `APPLICATION.VIEW_ALL.DEPARTMENT`
- `APPLICATION.EXPORT.DEPARTMENT`
- `APPLICATION.APPROVE.OWN`
- `APPLICATION.REJECT.OWN`
- `APPLICATION.READ.OWN`
- `APPLICATION.UPDATE.OWN`
- `APPLICATION.DELETE.OWN`
- `FILE.CREATE.DEPARTMENT`
- `FILE.READ.DEPARTMENT`
- `FILE.UPDATE.DEPARTMENT`
- `FILE.CREATE.OWN`
- `FILE.READ.OWN`
- `FILE.UPDATE.OWN`
- `FILE.DELETE.OWN`
- `FOLDER.CREATE.DEPARTMENT`
- `FOLDER.READ.DEPARTMENT`
- `FOLDER.CREATE.OWN`
- `FOLDER.READ.OWN`
- `FOLDER.UPDATE.OWN`
- `ANALYTICS.READ.DEPARTMENT`
- `ANALYTICS.READ.OWN`
- `USER.READ.DEPARTMENT`

**Typical Use Cases:**
- Credit officers
- Loan officers
- Department heads
- Team leads

---

### 5. Portfolio Officer (Level 50)
**Role Name:** `portfolio_officer`
**Display Name:** Portfolio Officer
**Permissions:** 15

**Description:**
Own portfolio management. Can manage customer portfolios and create applications on behalf of customers.

**Key Permissions:**
- `APPLICATION.CREATE.OWN`
- `APPLICATION.READ.OWN`
- `APPLICATION.UPDATE.OWN`
- `APPLICATION.READ.TEAM`
- `FILE.CREATE.OWN`
- `FILE.READ.OWN`
- `FILE.UPDATE.OWN`
- `FILE.READ.TEAM`
- `FOLDER.CREATE.OWN`
- `FOLDER.READ.OWN`
- `FOLDER.UPDATE.OWN`
- `FOLDER.READ.TEAM`
- `ANALYTICS.READ.OWN`
- `ANALYTICS.READ.TEAM`
- `USER.READ.OWN`

**Typical Use Cases:**
- Portfolio officers
- Account managers
- Customer relationship managers

---

### 6. Teller (Level 40)
**Role Name:** `teller`
**Display Name:** Teller
**Permissions:** 9

**Description:**
Application processing. Can process account IDs, validate customer information, and update assigned applications.

**Key Permissions:**
- `APPLICATION.READ.TEAM`
- `APPLICATION.UPDATE.TEAM`
- `APPLICATION.READ.OWN`
- `APPLICATION.UPDATE.OWN`
- `FILE.READ.TEAM`
- `FILE.READ.OWN`
- `FOLDER.READ.TEAM`
- `FOLDER.READ.OWN`
- `USER.READ.OWN`

**Key Restrictions:**
- Cannot create applications
- Cannot approve or reject
- Limited to team and own scope
- No delete permissions

**Typical Use Cases:**
- Tellers
- Front desk staff
- Customer service representatives

---

### 7. Data Entry Clerk (Level 30)
**Role Name:** `data_entry_clerk`
**Display Name:** Data Entry Clerk
**Permissions:** 11

**Description:**
Basic data entry. Can create draft applications and upload documents.

**Key Permissions:**
- `APPLICATION.CREATE.OWN`
- `APPLICATION.READ.OWN`
- `APPLICATION.UPDATE.OWN`
- `FILE.CREATE.OWN`
- `FILE.READ.OWN`
- `FILE.UPDATE.OWN`
- `FOLDER.CREATE.OWN`
- `FOLDER.READ.OWN`
- `FOLDER.UPDATE.OWN`
- `USER.READ.OWN`
- `NOTIFICATION.READ.OWN`

**Key Restrictions:**
- Own scope only
- Cannot approve or reject
- Cannot delete
- Cannot access team or department data

**Typical Use Cases:**
- Data entry clerks
- Administrative assistants
- Junior staff

---

## Permission Scope Definitions

### GLOBAL
- Access to all records across the entire system
- No restrictions based on branch, department, or ownership

### BRANCH
- Access to records within the user's assigned branch
- Includes all departments within the branch

### DEPARTMENT
- Access to records within the user's assigned department
- Limited to specific department only

### TEAM
- Access to records within the user's team or portfolio
- Typically includes records assigned to the user's team

### OWN
- Access to records created by or assigned to the user only
- Most restrictive scope

---

## Role Assignment Guidelines

### When to Assign Each Role

**Admin:**
- System administrators only
- IT staff with full system access needs
- Use sparingly for security

**Branch Manager:**
- Branch managers and supervisors
- Regional managers overseeing multiple branches
- Senior staff with branch-level authority

**Reviewer/Auditor:**
- Internal audit staff
- Compliance officers
- External auditors (temporary access)
- Quality assurance personnel

**Credit Officer:**
- Credit/loan officers
- Department heads
- Team leads with approval authority
- Senior credit analysts

**Portfolio Officer:**
- Portfolio managers
- Account managers
- Customer relationship officers
- Field officers

**Teller:**
- Front desk tellers
- Customer service representatives
- Staff who process transactions
- Junior officers

**Data Entry Clerk:**
- Data entry personnel
- Administrative assistants
- Junior staff
- Temporary workers

---

## Permission Templates

Each standard role has a corresponding permission template that can be used to:
1. Quickly assign permissions to new users
2. Create custom roles based on standard templates
3. Export/import role configurations between environments

**Template Names:**
- Administrator Template
- Branch Manager Template
- Reviewer/Auditor Template
- Credit Officer Template
- Portfolio Officer Template
- Teller Template
- Data Entry Clerk Template

---

## Security Considerations

### System Roles
All standard roles are marked as `is_system_role=true`, which means:
- They cannot be deleted
- They should not be modified without careful consideration
- They serve as the foundation for the permission system

### Role Hierarchy
The level system (30-100) establishes a clear hierarchy:
- Higher level roles have more privileges
- Use levels to determine role precedence
- Consider hierarchy when assigning roles

### Scope Restrictions
Always consider scope when assigning roles:
- GLOBAL scope should be limited to trusted users
- BRANCH and DEPARTMENT scopes provide good balance
- OWN scope is safest for junior staff

---

## Troubleshooting

### User Cannot Access Expected Resources
1. Check user's assigned role
2. Verify role has required permissions
3. Check scope restrictions (branch/department assignment)
4. Verify user is active and role is active

### Role Has Too Many/Few Permissions
1. Review role-permission assignments in database
2. Re-run seeding script if needed
3. Check for custom permission modifications
4. Verify against this reference document

### Need Custom Role
1. Start with closest standard role template
2. Create new role based on template
3. Modify permissions as needed
4. Document custom role for future reference

---

## Related Documentation

- [Permission Seeding Implementation Summary](./PERMISSION_SEEDING_IMPLEMENTATION_SUMMARY.md)
- [Permission System Quick Reference](../PERMISSION_SYSTEM_QUICK_REFERENCE.md)
- [Design Document](.kiro/specs/permission-templates-and-role-seeding/design.md)
- [Requirements Document](.kiro/specs/permission-templates-and-role-seeding/requirements.md)

---

## Maintenance

### Updating Standard Roles
If you need to update standard role permissions:
1. Modify `seed_permissions.py` script
2. Update role-permission assignments
3. Re-run seeding script (idempotent)
4. Update this documentation
5. Notify all administrators

### Adding New Permissions
When adding new permissions:
1. Add to `generate_comprehensive_permissions()` function
2. Assign to appropriate roles
3. Update templates if needed
4. Re-run seeding script
5. Update documentation

---

**Last Updated:** January 19, 2025
**Version:** 1.0
**Maintained By:** Development Team
