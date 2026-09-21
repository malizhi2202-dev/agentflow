#!/usr/bin/env python3
"""BACKEND IMPORT — Step 1: Verify all modules import correctly."""
import sys, os
# Add backend/ to path (the project uses backend-relative imports like `from database import ...`)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from models import AgentProbe, SchedulerQueue
from services.agent_probe_service import ProbeService, _sanitize_api_keys, _resolve_health_url
from services.scheduler_service import SchedulerService
from routes.control_plane_api import router
from engine.reconcile_loop import _detect_drift, _classify_action
print("ALL IMPORTS OK")
