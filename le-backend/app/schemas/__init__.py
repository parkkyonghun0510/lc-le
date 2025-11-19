# Schema package initialization


# Import schemas directly from the main schemas.py file
# We need to import the module directly to avoid package vs file confusion
import sys
import os

# Get the path to the schemas.py file
schemas_file = os.path.join(os.path.dirname(__file__), '..', 'schemas.py')

# Execute the schemas.py file to get all the classes
schemas_globals = {}
with open(schemas_file, 'r') as f:
    exec(f.read(), schemas_globals)

# Make all non-private attributes available
for attr in schemas_globals:
    if not attr.startswith('_'):
        setattr(sys.modules[__name__], attr, schemas_globals[attr])
