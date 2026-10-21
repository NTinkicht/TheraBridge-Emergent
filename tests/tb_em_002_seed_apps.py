# Helper: create synthetic TEST_ applications via the public API for UI tests (prints references).
import sys, uuid
sys.path.insert(0, '/app/tests')
from test_tb_em_002_applications_api import submit, body

for i in range(int(sys.argv[1]) if len(sys.argv) > 1 else 1):
    r = submit(body(organizationName=f'TEST_UI Concurrency {uuid.uuid4().hex[:4]}'))
    print(r.status_code, r.json().get('reference'))
