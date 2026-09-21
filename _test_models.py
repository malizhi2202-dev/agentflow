import sys
sys.path.insert(0, 'backend')
from database import init_db
init_db()
print('DB init OK')
from models.agent_memory import AgentMemory, MEMORY_TYPES
print('MEMORY_TYPES:', MEMORY_TYPES)
from services.host_metrics import get_host_metrics
m = get_host_metrics()
print('Host metrics:', m)
print('All models OK!')
