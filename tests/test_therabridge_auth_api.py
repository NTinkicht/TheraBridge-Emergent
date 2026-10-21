# TheraBridge TB-EM-001 API security spot checks (public URL). Passwords read from gitignored local file.
import json
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
ORIGIN = BASE_URL
CREDS = {a['email']: a['password'] for a in json.load(open('/app/.workspace/local-credentials/synthetic-accounts.json'))['accounts']}


def new_session():
    s = requests.Session()
    s.headers.update({'Origin': ORIGIN})
    return s


def login(email):
    s = new_session()
    tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
    r = s.post(f'{BASE_URL}/api/auth/login', json={'email': email, 'password': CREDS[email]}, headers={'X-CSRF-Token': tok})
    assert r.status_code == 200, r.text
    return s, r.json()


# Origin / CSRF pre-auth checks
class TestOriginCsrf:
    def test_foreign_origin_login_403(self):
        s = requests.Session()
        tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
        r = s.post(f'{BASE_URL}/api/auth/login', json={'email': 'admin@harbor.therabridge.test', 'password': 'x'},
                   headers={'Origin': 'https://evil.example.com', 'X-CSRF-Token': tok})
        assert r.status_code == 403

    def test_login_without_csrf_403(self):
        s = new_session()
        r = s.post(f'{BASE_URL}/api/auth/login', json={'email': 'admin@harbor.therabridge.test', 'password': 'x'})
        assert r.status_code == 403

    def test_non_json_body_415(self):
        s = new_session()
        r = s.post(f'{BASE_URL}/api/auth/login', data='email=a', headers={'Content-Type': 'application/x-www-form-urlencoded'})
        assert r.status_code == 415

    def test_auth_no_store(self):
        r = requests.get(f'{BASE_URL}/api/auth/csrf')
        assert 'no-store' in r.headers.get('cache-control', '')


# Login + cookies
class TestLogin:
    def test_admin_login_cookie_flags(self):
        s = new_session()
        tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
        r = s.post(f'{BASE_URL}/api/auth/login', json={'email': 'admin@harbor.therabridge.test', 'password': CREDS['admin@harbor.therabridge.test']}, headers={'X-CSRF-Token': tok})
        assert r.status_code == 200
        sc = r.headers.get('set-cookie', '')
        assert 'HttpOnly' in sc and 'Secure' in sc
        d = r.json()
        assert d['activeContext']['type'] == 'center'
        assert d['activeContext']['role'] == 'CENTER_ADMIN'
        assert 'password' not in json.dumps(d).lower() or 'passwordHash' not in json.dumps(d)

    def test_session_unauthenticated_401(self):
        r = requests.get(f'{BASE_URL}/api/auth/session')
        assert r.status_code == 401


# Tenant isolation / authz
class TestAuthz:
    @pytest.fixture(scope='class')
    def ids(self):
        _, d = login('multi@therabridge.test')
        out = {c['centerName']: c for c in d['contexts'] if c['type'] == 'center'}
        assert len(out) == 2
        return out

    def test_cross_tenant_summary_404(self, ids):
        s, d = login('admin@harbor.therabridge.test')
        cedar = [v for k, v in ids.items() if 'Cedar' in k][0]['centerId']
        r = s.get(f'{BASE_URL}/api/centers/{cedar}/summary')
        assert r.status_code == 404
        own = d['activeContext']['centerId']
        r2 = s.get(f'{BASE_URL}/api/centers/{own}/summary')
        assert r2.status_code == 200 and r2.json()['activeMembers'] >= 1

    def test_platform_summary_as_center_admin_403(self):
        s, _ = login('admin@harbor.therabridge.test')
        assert s.get(f'{BASE_URL}/api/platform/summary').status_code == 403

    def test_platform_summary_as_platform_admin(self):
        s, _ = login('platform.ops@therabridge.test')
        r = s.get(f'{BASE_URL}/api/platform/summary')
        assert r.status_code == 200 and r.json()['centers'] == 2

    def test_context_extra_field_400(self, ids):
        s, d = login('multi@therabridge.test')
        c = list(ids.values())[0]
        r = s.post(f'{BASE_URL}/api/auth/context', json={'membershipId': c['membershipId'], 'role': c['role'], 'isPlatformAdmin': True},
                   headers={'X-CSRF-Token': d['csrfToken']})
        assert r.status_code == 400

    def test_context_without_csrf_403(self, ids):
        s, d = login('multi@therabridge.test')
        c = list(ids.values())[0]
        r = s.post(f'{BASE_URL}/api/auth/context', json={'membershipId': c['membershipId'], 'role': c['role']})
        assert r.status_code == 403

    def test_context_role_escalation_rejected(self, ids):
        s, d = login('multi@therabridge.test')
        harbor = [v for k, v in ids.items() if 'Harbor' in k][0]
        r = s.post(f'{BASE_URL}/api/auth/context', json={'membershipId': harbor['membershipId'], 'role': 'CENTER_ADMIN'},
                   headers={'X-CSRF-Token': d['csrfToken']})
        assert r.status_code in (400, 403, 404)

    def test_guardian_no_summary(self):
        s, d = login('sara.morgan@family.therabridge.test')
        cid = d['activeContext']['centerId'] if d.get('activeContext') else None
        if cid:
            assert s.get(f'{BASE_URL}/api/centers/{cid}/summary').status_code == 403

    def test_logout_revokes(self):
        s, d = login('admin@harbor.therabridge.test')
        jar = {c.name: c.value for c in s.cookies}
        r = s.post(f'{BASE_URL}/api/auth/logout', headers={'X-CSRF-Token': d['csrfToken']})
        assert r.status_code == 204
        # replay old cookie explicitly
        assert requests.get(f'{BASE_URL}/api/auth/session', cookies=jar).status_code == 401


# Session revocation + password endpoints
class TestSessionsPasswords:
    def test_logout_all_revokes_other_sessions(self):
        s1, d1 = login('leila.hassan@harbor.therabridge.test')
        s2, _ = login('leila.hassan@harbor.therabridge.test')
        assert s2.get(f'{BASE_URL}/api/auth/session').status_code == 200
        r = s1.post(f'{BASE_URL}/api/auth/logout-all', headers={'X-CSRF-Token': d1['csrfToken']})
        assert r.status_code == 204
        assert s2.get(f'{BASE_URL}/api/auth/session').status_code == 401

    def test_reset_bogus_token_rejected(self):
        s = new_session()
        tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
        r = s.post(f'{BASE_URL}/api/auth/password/reset', json={'token': 'x' * 24, 'password': 'Gentle river morning walk 42'}, headers={'X-CSRF-Token': tok})
        assert r.status_code in (400, 401, 410, 422)
        assert 'message' in r.json()

    def test_forgot_uniform_response(self):
        out = []
        for em in ['admin@harbor.therabridge.test', 'ghost@nowhere.test']:
            s = new_session()
            tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
            r = s.post(f'{BASE_URL}/api/auth/password/forgot', json={'email': em}, headers={'X-CSRF-Token': tok})
            out.append((r.status_code, r.json()))
        assert out[0] == out[1] and out[0][0] == 202

    def test_change_password_weak_rejected(self):
        s, d = login('leila.hassan@harbor.therabridge.test')
        r = s.post(f'{BASE_URL}/api/auth/password/change', json={'currentPassword': CREDS['leila.hassan@harbor.therabridge.test'], 'newPassword': 'short'},
                   headers={'X-CSRF-Token': d['csrfToken']})
        assert r.status_code in (400, 422)
        assert '12' in json.dumps(r.json())
