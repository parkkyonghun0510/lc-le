# Models package
from .audit import AuditLog, AuditEventType
from .permissions import (
    Permission, Role, RolePermission, UserRole, UserPermission, PermissionTemplate,
    ResourceType, PermissionAction, PermissionScope
)

# Import models from parent models.py using relative import
import importlib
import importlib.util
import sys
from pathlib import Path

# Get the parent directory and import models
parent_dir = Path(__file__).parent.parent
models_path = parent_dir / "models.py"

if models_path.exists():
    spec = importlib.util.spec_from_file_location("parent_models", models_path)
    if spec is not None and spec.loader is not None:
        parent_models = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(parent_models)

        # Import all model classes
        User = parent_models.User
        Department = parent_models.Department
        Branch = parent_models.Branch
        CustomerApplication = parent_models.CustomerApplication
        File = parent_models.File
        Setting = parent_models.Setting
        Position = parent_models.Position
        Folder = parent_models.Folder
        Selfie = parent_models.Selfie
        BulkOperation = parent_models.BulkOperation


__all__ = [
    "AuditLog", "AuditEventType", "User", "Department", "Branch",
    "CustomerApplication", "File", "Setting", "Position", "Folder", "Selfie", "BulkOperation",
    "Permission", "Role", "RolePermission", "UserRole", "UserPermission", "PermissionTemplate",
    "ResourceType", "PermissionAction", "PermissionScope"
]