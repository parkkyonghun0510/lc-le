# Users router package
# Import router directly from the users.py file to avoid circular imports
import sys
import os
import importlib.util

# Load the users module directly from the file path
users_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'users.py')
spec = importlib.util.spec_from_file_location("users", users_file_path)
users_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(users_module)
router = users_module.router

__all__ = ['router']