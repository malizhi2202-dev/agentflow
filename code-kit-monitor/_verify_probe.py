import py_compile
py_compile.compile('backend/services/agent_probe_service.py', doraise=True)
print('probe_service syntax OK')
