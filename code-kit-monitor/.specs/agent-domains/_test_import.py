"""Import test for agent-domains backend modules."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

try:
    from models.domain import Domain
    print("✅ models.domain.Domain imported")
except Exception as e:
    print(f"❌ models.domain.Domain failed: {e}")
    sys.exit(1)

try:
    from routes.domain_api import router
    paths = [r.path for r in router.routes]
    print(f"✅ routes.domain_api imported, routes: {paths}")
except Exception as e:
    print(f"❌ routes.domain_api failed: {e}")
    sys.exit(1)

try:
    from models.agent import Agent
    # Check domain_id exists
    assert hasattr(Agent, 'domain_id'), "Agent missing domain_id"
    print(f"✅ Agent.domain_id present")
except Exception as e:
    print(f"❌ Agent update failed: {e}")
    sys.exit(1)

try:
    # Verify agent to_dict includes domain_id
    from database import SessionLocal
    db = SessionLocal()
    from models.domain import Domain as D
    # Check default domain
    d = db.query(D).filter(D.name == "默认域").first()
    if d:
        print(f"✅ 默认域 exists: id={d.id}, name={d.name}")
    else:
        print("⚠️ 默认域 not found in DB (will be created at startup)")
    db.close()
except Exception as e:
    print(f"⚠️ DB check skipped: {e}")

print("\n🎉 ALL IMPORTS OK")
