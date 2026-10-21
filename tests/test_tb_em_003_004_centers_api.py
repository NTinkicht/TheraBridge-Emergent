# TheraBridge TB-EM-003/004 center provisioning + staff onboarding API spot checks (public URL). Secrets never printed.
import glob
import json
import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = ''
with open('/app/frontend/.env') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
ORIGIN = BASE_URL
CREDS = {a['email']: a['password'] for a in json.load(open('/app/.workspace/local-credentials/synthetic-accounts.json'))['accounts']}
PLATFORM = 'platform.ops@therabridge.test'
HARBOR_ADMIN = 'admin@harbor.therabridge.test'
CEDAR_ADMIN = 'admin@cedar.therabridge.test'
OUTBOX = '/app/apps/api/.outbox'
STRONG = 'Calm-Precision-Warmth-2026!'
RUN = uuid.uuid4().hex[:6]


def pre_session():
    s = requests.Session()
    s.headers.update({'Origin': ORIGIN})
    tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
    return s, tok


def login(email, password=None):
    s, tok = pre_session()
    r = s.post(f'{BASE_URL}/api/auth/login', json={'email': email, 'password': password or CREDS[email]}, headers={'X-CSRF-Token': tok})
    assert r.status_code == 200, r.text[:300]
    sess = s.get(f'{BASE_URL}/api/auth/session').json()
    return s, sess.get('csrfToken') or r.json().get('csrfToken'), sess


def latest_token_for(email, after=0):
    for _ in range(20):
        files = sorted(glob.glob(f'{OUTBOX}/*.json'), key=os.path.getmtime, reverse=True)
        for fp in files:
            if os.path.getmtime(fp) < after:
                continue
            d = json.load(open(fp))
            if d.get('to', '').lower() == email.lower():
                m = re.search(r'#token=([A-Za-z0-9_-]+)', d.get('body', ''))
                if m:
                    return m.group(1)
        time.sleep(0.5)
    return None


def no_secret(text):
    return 'tokenHash' not in text and 'token_hash' not in text and not re.search(r'#token=', text)


@pytest.fixture(scope='module')
def platform():
    return login(PLATFORM)


@pytest.fixture(scope='module')
def created(platform):
    s, csrf, _ = platform
    admin_email = f'test-admin-{RUN}@example.test'
    t0 = time.time() - 1
    r = s.post(f'{BASE_URL}/api/platform/centers', headers={'X-CSRF-Token': csrf}, json={
        'name': f'TEST_ API Center {RUN}', 'country': 'United States', 'city': 'Boston', 'timezone': 'America/New_York',
        'specialties': ['speech'], 'firstAdmin': {'email': admin_email, 'displayName': 'Test Admin'}})
    assert r.status_code == 201, r.text[:400]
    return r.json(), admin_email, t0


class TestPlatformCenters:
    def test_create_no_secret(self, created):
        data, _, _ = created
        assert no_secret(json.dumps(data))

    def test_detail_no_secret(self, platform, created):
        s, _, _ = platform
        cid = (created[0].get('center') or created[0]).get('id')
        r = s.get(f'{BASE_URL}/api/platform/centers/{cid}')
        assert r.status_code == 200
        assert no_secret(r.text)

    def test_duplicate_name_409(self, platform, created):
        s, csrf, _ = platform
        r = s.post(f'{BASE_URL}/api/platform/centers', headers={'X-CSRF-Token': csrf}, json={
            'name': f'test_ api center {RUN}', 'country': 'United States', 'city': 'Boston', 'timezone': 'America/New_York',
            'specialties': ['speech'], 'firstAdmin': {'email': f'test-dup-{RUN}@example.test', 'displayName': 'Dup Admin'}})
        assert r.status_code == 409

    def test_validation_400(self, platform):
        s, csrf, _ = platform
        r = s.post(f'{BASE_URL}/api/platform/centers', headers={'X-CSRF-Token': csrf}, json={'name': 'x'})
        assert r.status_code == 400

    def test_no_csrf_403(self, platform):
        s, _, _ = platform
        r = s.post(f'{BASE_URL}/api/platform/centers', json={'name': 'TEST_ nocsrf'})
        assert r.status_code == 403

    def test_center_admin_forbidden(self):
        s, _, _ = login(HARBOR_ADMIN)
        assert s.get(f'{BASE_URL}/api/platform/centers').status_code == 403


class TestAcceptance:
    def test_inspect_and_accept_new(self, created):
        data, email, t0 = created
        tok = latest_token_for(email, t0)
        assert tok, 'no invitation found in outbox'
        s, csrf = pre_session()
        r = s.post(f'{BASE_URL}/api/invitations/inspect', json={'token': tok}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (200, 201), r.text[:300]
        assert no_secret(r.text)
        # weak password rejected
        r = s.post(f'{BASE_URL}/api/invitations/accept-new', json={'token': tok, 'displayName': 'Test Admin', 'password': 'short'}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (400, 422)
        r = s.post(f'{BASE_URL}/api/invitations/accept-new', json={'token': tok, 'displayName': 'Test Admin', 'password': STRONG}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (200, 201), r.text[:300]
        assert no_secret(r.text)
        # reuse fails
        s2, csrf2 = pre_session()
        r = s2.post(f'{BASE_URL}/api/invitations/accept-new', json={'token': tok, 'displayName': 'Again', 'password': STRONG}, headers={'X-CSRF-Token': csrf2})
        assert r.status_code >= 400

    def test_new_admin_session_and_isolation(self, created):
        data, email, _ = created
        s, csrf, sess = login(email, STRONG)
        txt = json.dumps(sess)
        assert 'CENTER_ADMIN' in txt
        cid = (data.get('center') or data).get('id')
        assert s.get(f'{BASE_URL}/api/centers/{cid}/staff').status_code == 200
        # Harbor admin sees 404 for this new center
        h, _, _ = login(HARBOR_ADMIN)
        assert h.get(f'{BASE_URL}/api/centers/{cid}/staff').status_code == 404
        assert h.get(f'{BASE_URL}/api/centers/{cid}/settings').status_code == 404

    def test_staff_invite_duplicate_and_no_secret(self, created):
        data, email, _ = created
        cid = (data.get('center') or data).get('id')
        s, csrf, _ = login(email, STRONG)
        body = {'email': f'test-staff-{RUN}@example.test', 'displayName': 'Test Staff', 'roles': ['THERAPIST', 'CLINICAL_SUPERVISOR'], 'specialties': ['speech']}
        r = s.post(f'{BASE_URL}/api/centers/{cid}/invitations', json=body, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 201, r.text[:300]
        assert no_secret(r.text)
        r = s.post(f'{BASE_URL}/api/centers/{cid}/invitations', json=body, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 409
        # CENTER_ADMIN cannot be granted by center admin
        r = s.post(f'{BASE_URL}/api/centers/{cid}/invitations', json={**body, 'email': f'test-x-{RUN}@example.test', 'roles': ['CENTER_ADMIN']}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 400
        r = s.get(f'{BASE_URL}/api/centers/{cid}/invitations')
        assert r.status_code == 200 and no_secret(r.text)


# Role permissions, suspension session revocation, self-protection and cross-tenant member access
def _accept_new(email, after):
    tok = latest_token_for(email, after)
    assert tok, f'no invitation for {email}'
    s, csrf = pre_session()
    r = s.post(f'{BASE_URL}/api/invitations/accept-new', json={'token': tok, 'displayName': 'Test Person', 'password': STRONG}, headers={'X-CSRF-Token': csrf})
    assert r.status_code in (200, 201), r.text[:300]
    return login(email, STRONG)


class TestPermissions:
    @pytest.fixture(scope='class')
    def team(self, created):
        data, admin_email, _ = created
        cid = (data.get('center') or data).get('id')
        a, acsrf, asess = login(admin_email, STRONG)
        t0 = time.time() - 1
        coord, ther = f'test-pcoord-{RUN}@example.test', f'test-pther-{RUN}@example.test'
        for em, roles in ((coord, ['COORDINATOR']), (ther, ['THERAPIST'])):
            r = a.post(f'{BASE_URL}/api/centers/{cid}/invitations', json={'email': em, 'displayName': 'Test Person', 'roles': roles}, headers={'X-CSRF-Token': acsrf})
            assert r.status_code == 201, r.text[:200]
        return {'cid': cid, 'admin': (a, acsrf, asess), 'coord': _accept_new(coord, t0), 'ther': _accept_new(ther, t0)}

    def test_coordinator_read_only(self, team):
        s, csrf, _ = team['coord']
        cid = team['cid']
        assert s.get(f'{BASE_URL}/api/centers/{cid}/staff').status_code == 200
        r = s.post(f'{BASE_URL}/api/centers/{cid}/invitations', json={'email': f'test-n-{RUN}@example.test', 'displayName': 'Nope', 'roles': ['THERAPIST']}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 403
        assert s.patch(f'{BASE_URL}/api/centers/{cid}/settings', json={'city': 'X', 'version': 1}, headers={'X-CSRF-Token': csrf}).status_code == 403

    def test_therapist_no_directory(self, team):
        s, _, _ = team['ther']
        cid = team['cid']
        assert s.get(f'{BASE_URL}/api/centers/{cid}/staff').status_code == 403
        assert s.get(f'{BASE_URL}/api/centers/{cid}/me').status_code == 200

    def test_admin_cannot_suspend_self(self, team):
        a, csrf, sess = team['admin']
        mid = sess['activeContext']['membershipId']
        r = a.post(f'{BASE_URL}/api/centers/{team["cid"]}/staff/{mid}/suspend', json={'reason': 'self test'}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (400, 403, 409, 422), r.status_code

    def test_suspend_revokes_live_session(self, team):
        a, csrf, _ = team['admin']
        ts, _, tsess = team['ther']
        mid = tsess['activeContext']['membershipId']
        cid = team['cid']
        r = a.post(f'{BASE_URL}/api/centers/{cid}/staff/{mid}/suspend', json={'reason': 'TEST suspend'}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (200, 201), r.text[:200]
        assert ts.get(f'{BASE_URL}/api/centers/{cid}/me').status_code in (401, 403, 404)
        r = a.post(f'{BASE_URL}/api/centers/{cid}/staff/{mid}/reactivate', json={}, headers={'X-CSRF-Token': csrf})
        assert r.status_code in (200, 201), r.text[:200]

    def test_cross_tenant_member_404(self, team):
        _, _, tsess = team['ther']
        mid = tsess['activeContext']['membershipId']
        h, _, hsess = login(HARBOR_ADMIN)
        hcid = hsess['activeContext']['centerId']
        assert h.get(f'{BASE_URL}/api/centers/{hcid}/staff/{mid}').status_code == 404
        assert h.get(f'{BASE_URL}/api/centers/{team["cid"]}/staff/{mid}').status_code == 404

    def test_accept_new_for_existing_email_refused(self, team):
        a, csrf, _ = team['admin']
        t0 = time.time() - 1
        em = 'supervisor@harbor.therabridge.test'
        r = a.post(f'{BASE_URL}/api/centers/{team["cid"]}/invitations', json={'email': em, 'displayName': 'Sup', 'roles': ['CLINICAL_SUPERVISOR']}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 201, r.text[:200]
        tok = latest_token_for(em, t0)
        s, pc = pre_session()
        r = s.post(f'{BASE_URL}/api/invitations/accept-new', json={'token': tok, 'displayName': 'Hijack', 'password': STRONG}, headers={'X-CSRF-Token': pc})
        assert r.status_code in (400, 403, 409, 422), r.status_code
        # cleanup: revoke the pending invitation
        inv = [i for i in a.get(f'{BASE_URL}/api/centers/{team["cid"]}/invitations').json().get('items', []) if i.get('email') == em]
        for i in inv:
            a.post(f'{BASE_URL}/api/centers/{team["cid"]}/invitations/{i["id"]}/revoke', json={}, headers={'X-CSRF-Token': csrf})
