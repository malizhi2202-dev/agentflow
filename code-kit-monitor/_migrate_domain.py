"""DB migration: add domain_id to agents table."""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "platform.db")
print(f"DB path: {db_path}")
if not os.path.exists(db_path):
    print("DB file does not exist, skipping migration")
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(agents)")
    cols = [c[1] for c in cur.fetchall()]
    print(f"Existing columns: {cols}")
    if 'domain_id' not in cols:
        cur.execute('ALTER TABLE agents ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL')
        print('Added domain_id column to agents table')
    else:
        print('domain_id column already exists')
    conn.commit()
    conn.close()
    print('Migration complete')
