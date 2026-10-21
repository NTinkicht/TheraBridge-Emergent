# TB-EM-005 shared helpers (login, outbox); secrets never printed.
import glob, json, os, re, time
import requests

BASE_URL = ''
with open('/app/frontend/.env') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
CREDS = {a['email']: a['password'] for a in json.load(open('/app/.workspace/local-credentials/synthetic-accounts.json'))['accounts']}
OUTBOX = '/app/apps/api/.outbox'


def login(email, password=None):
    s = requests.Session()
    s.headers.update({'Origin': BASE_URL})
    tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
    r = s.post(f'{BASE_URL}/api/auth/login', json={'email': email, 'password': password or CREDS[email]}, headers={'X-CSRF-Token': tok})
    assert r.status_code == 200, r.text[:300]
    sess = s.get(f'{BASE_URL}/api/auth/session').json()
    csrf = sess.get('csrfToken') or r.json().get('csrfToken')
    s.headers.update({'X-CSRF-Token': csrf})
    return s, sess


def latest_token_for(email, after=0):
    for _ in range(20):
        for fp in sorted(glob.glob(f'{OUTBOX}/*.json'), key=os.path.getmtime, reverse=True):
            if os.path.getmtime(fp) < after:
                continue
            d = json.load(open(fp))
            if d.get('to', '').lower() == email.lower():
                m = re.search(r'#token=([A-Za-z0-9_-]+)', d.get('body', ''))
                if m:
                    return m.group(1)
        time.sleep(0.5)
    return None
