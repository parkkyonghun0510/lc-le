# Schema package initialization

# Import permission schemas first
from ..permission_schemas import *

# Import all schemas from the main schemas file
import importlib
_schemas_module = importlib.import_module('app.schemas')

# Make all non-private attributes from the schemas module available in this package
import sys
for attr in dir(_schemas_module):
    if not attr.startswith('_'):
        setattr(sys.modules[__name__], attr, getattr(_schemas_module, attr))
