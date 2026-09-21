"""Init DB to create domains table."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import init_db
init_db()
print("DB initialized successfully")
