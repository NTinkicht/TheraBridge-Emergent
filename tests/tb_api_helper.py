# Iteration 12 state inspector for Harbor children/appointments (no secrets printed).
import json, sys
sys.path.insert(0, '/app/tests')
from tb_em_005_helpers import BASE_URL, login

HARBOR = '1efeae51-3b19-440b-bac6-48b3129fd79a'

if __name__ == '__main__':
    s, d = login('admin@harbor.therabridge.test')
    for st in ['ACTIVE', 'ARCHIVED']:
        r = s.get(f'{BASE_URL}/api/centers/{HARBOR}/children?status={st}')
        print(st, r.status_code, json.dumps([{k: c[k] for k in ('id', 'firstName', 'lastName', 'services', 'guardians', 'status')} for c in r.json().get('items', [])]))
    print('trial', s.get(f'{BASE_URL}/api/centers/{HARBOR}/trial').json())
    if len(sys.argv) > 1:
        c = s.get(f'{BASE_URL}/api/centers/{HARBOR}/children/{sys.argv[1]}').json()
        print('tz', c.get('timezone'))
        print('guardians', json.dumps([{k: g.get(k) for k in ('id', 'displayName', 'portalStatus')} for g in c['guardians']]))
        print('assign', json.dumps([{k: a.get(k) for k in ('id', 'therapist', 'service', 'endedAt')} for a in c['assignments']]))
        print('appts', json.dumps([{k: a.get(k) for k in ('id', 'startsAt', 'status', 'therapist')} for a in c['appointments']]))
        print('events', [e['type'] for e in c['events']])
