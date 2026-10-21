# Iteration 12: book TEST appointments on Sunday (center-local) via API to probe schedule week boundaries.
import sys, json
sys.path.insert(0, '/app/tests')
from tb_em_005_helpers import BASE_URL, login
H = '1efeae51-3b19-440b-bac6-48b3129fd79a'
CID = 'a60518ff-e715-41f6-b0a7-aee542b1c311'
LEILA = 'e8c2ed95-3973-45a8-bcee-dd45f930a4ce'
s, _ = login('admin@harbor.therabridge.test')
for st, en in [('2026-10-25T19:00:00.000Z', '2026-10-25T19:45:00.000Z'), ('2026-10-26T01:00:00.000Z', '2026-10-26T01:45:00.000Z')]:
    r = s.post(f'{BASE_URL}/api/centers/{H}/appointments', json={'childId': CID, 'membershipId': LEILA, 'service': 'speech', 'startsAt': st, 'endsAt': en, 'room': 'TEST_sunday'})
    print(st, r.status_code, r.text[:200])
r = s.get(f'{BASE_URL}/api/centers/{H}/appointments', params={'from': '2026-10-18T00:00:00Z', 'to': '2026-11-02T00:00:00Z'})
print(json.dumps([(a['startsAt'], a['status'], a['room']) for a in r.json()['items']]))
