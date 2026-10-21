# TheraBridge TB-EM-002 center applications API spot checks (public URL). Passwords read from gitignored local file.
import json
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
CENTER_ADMIN = 'admin@harbor.therabridge.test'


def body(email=None, **over):
    b = {
        'organizationName': f'TEST_API Center {uuid.uuid4().hex[:5]}', 'country': 'United States', 'city': 'Boston',
        'timezone': 'America/New_York', 'contactName': 'Test Person',
        'contactEmail': email or f'api.{uuid.uuid4().hex[:8]}@apitest.therabridge.test',
        'specialties': ['speech'], 'therapistEstimate': 5, 'childEstimate': 20, 'syntheticDataAcknowledged': True,
    }
    b.update(over)
    return b


def pre_session():
    s = requests.Session()
    s.headers.update({'Origin': ORIGIN})
    tok = s.get(f'{BASE_URL}/api/auth/csrf').json()['csrfToken']
    return s, tok


def login(email):
    s, tok = pre_session()
    r = s.post(f'{BASE_URL}/api/auth/login', json={'email': email, 'password': CREDS[email]}, headers={'X-CSRF-Token': tok})
    assert r.status_code == 200, r.text
    return s, r.json()['csrfToken']


def submit(b):
    s, tok = pre_session()
    return s.post(f'{BASE_URL}/api/center-applications', json=b, headers={'X-CSRF-Token': tok})


@pytest.fixture(scope='module')
def platform():
    return login(PLATFORM)


# Public submission
class TestSubmit:
    def test_without_pre_auth_token_403(self):
        r = requests.post(f'{BASE_URL}/api/center-applications', json=body(), headers={'Origin': ORIGIN})
        assert r.status_code == 403

    def test_extra_status_field_400(self):
        r = submit(body(status='APPROVED'))
        assert r.status_code == 400, r.text

    def test_valid_201_then_duplicate_email_case_insensitive_409(self, platform):
        email = f'dup.{uuid.uuid4().hex[:8]}@apitest.therabridge.test'
        r = submit(body(email=email))
        assert r.status_code == 201, r.text
        d = r.json()
        assert d['status'] == 'SUBMITTED' and d['reference'].startswith('APP-') and len(d['reference']) == 10
        r2 = submit(body(email=email.upper()))
        assert r2.status_code == 409, r2.text
        s, _ = platform
        lst = s.get(f'{BASE_URL}/api/platform/applications', params={'q': d['reference']}).json()
        assert lst['total'] == 1 and lst['items'][0]['reference'] == d['reference']


# Authorization
class TestAuthz:
    def test_anonymous_list_401(self):
        assert requests.get(f'{BASE_URL}/api/platform/applications').status_code == 401

    def test_center_admin_list_403(self):
        s, _ = login(CENTER_ADMIN)
        assert s.get(f'{BASE_URL}/api/platform/applications').status_code == 403


# Review / decision lifecycle
class TestLifecycle:
    def _new(self, platform):
        r = submit(body())
        assert r.status_code == 201, r.text
        s, _ = platform
        ref = r.json()['reference']
        item = s.get(f'{BASE_URL}/api/platform/applications', params={'q': ref}).json()['items'][0]
        return item['id']

    def test_review_decide_and_stale_version_409(self, platform):
        s, csrf = platform
        aid = self._new(platform)
        d = s.get(f'{BASE_URL}/api/platform/applications/{aid}').json()
        assert d['version'] == 1 and 'contactEmailNorm' not in d
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/start-review', json={'version': 1}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 200 and r.json()['status'] == 'UNDER_REVIEW'
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/decision', json={'decision': 'REJECTED', 'rationale': 'Short rationale x', 'version': 1}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 409
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/decision', json={'decision': 'REJECTED', 'rationale': 'Not a fit for TEST purposes', 'version': 2}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['status'] == 'REJECTED' and d['provisioning'] is None and [e['type'] for e in d['events']] == ['submitted', 'review_started', 'rejected']

    def test_short_rationale_400(self, platform):
        s, csrf = platform
        aid = self._new(platform)
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/decision', json={'decision': 'APPROVED', 'rationale': 'too short', 'version': 1}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 400

    def test_whitespace_padded_rationale_not_500(self, platform):
        # DTO checks length before trim; DB CHECK requires trimmed length >= 10
        s, csrf = platform
        aid = self._new(platform)
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/decision', json={'decision': 'REJECTED', 'rationale': 'no          ', 'version': 1}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 400, f'{r.status_code} {r.text}'

    def test_approve_does_not_create_center(self, platform):
        s, csrf = platform
        before = s.get(f'{BASE_URL}/api/platform/summary').json()
        aid = self._new(platform)
        r = s.post(f'{BASE_URL}/api/platform/applications/{aid}/decision', json={'decision': 'APPROVED', 'rationale': 'Approved for TEST purposes', 'version': 1}, headers={'X-CSRF-Token': csrf})
        assert r.status_code == 200, r.text
        assert r.json()['provisioning']['status'] == 'AWAITING_PROVISIONING'
        after = s.get(f'{BASE_URL}/api/platform/summary').json()
        assert after['centers'] == before['centers']

    def test_decide_without_csrf_403(self, platform):
        s, _ = platform
        r = s.post(f'{BASE_URL}/api/platform/applications/{uuid.uuid4()}/decision', json={'decision': 'APPROVED', 'rationale': 'x' * 12, 'version': 1})
        assert r.status_code == 403

    def test_unknown_id_404_and_bad_uuid_400(self, platform):
        s, _ = platform
        assert s.get(f'{BASE_URL}/api/platform/applications/{uuid.uuid4()}').status_code == 404
        assert s.get(f'{BASE_URL}/api/platform/applications/not-a-uuid').status_code == 400
