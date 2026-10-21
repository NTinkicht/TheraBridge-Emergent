# TB-EM-005 center operations API spot checks on the public URL (trial, tenant isolation, guardian scope, family privacy, seat limit).
import json
import os
import re
import sys
import time
import uuid

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from tb_em_005_helpers import BASE_URL, login  # noqa: E402

HARBOR_ADMIN = 'admin@harbor.therabridge.test'
CEDAR_ADMIN = 'admin@cedar.therabridge.test'
THERAPIST = 'leila.hassan@harbor.therabridge.test'
PLATFORM = 'platform.ops@therabridge.test'
RUN = uuid.uuid4().hex[:6]


@pytest.fixture(scope='module')
def harbor():
    s, sess = login(HARBOR_ADMIN)
    return s, sess['activeContext']['centerId']


def B(cid):
    return f'{BASE_URL}/api/centers/{cid}'


# Trial status
class TestTrial:
    def test_trial_shape(self, harbor):
        s, H = harbor
        t = s.get(B(H) + '/trial').json()
        assert t['onTrial'] is True and t['expired'] is False
        assert t['therapistSeats']['limit'] == 3 and t['children']['limit'] == 1
        assert isinstance(t['daysLeft'], int) and t['daysLeft'] > 0

    def test_platform_extend_validation(self, harbor):
        _, H = harbor
        p, _ = login(PLATFORM)
        r = p.post(f'{BASE_URL}/api/platform/centers/{H}/trial/extend', json={'days': 0, 'reason': 'x'})
        assert r.status_code in (400, 422)

    def test_center_admin_cannot_extend(self, harbor):
        s, H = harbor
        r = s.post(f'{BASE_URL}/api/platform/centers/{H}/trial/extend', json={'days': 5, 'reason': 'TEST_ self extend'})
        assert r.status_code in (403, 404)


# Tenant isolation and role scope
class TestIsolation:
    def test_cedar_admin_404_on_harbor_children(self, harbor):
        _, H = harbor
        c, _ = login(CEDAR_ADMIN)
        r = c.get(B(H) + '/children')
        assert r.status_code == 404, r.status_code

    def test_cedar_admin_404_on_harbor_appointments(self, harbor):
        _, H = harbor
        c, _ = login(CEDAR_ADMIN)
        r = c.get(B(H) + '/appointments', params={'from': '2026-01-01T00:00:00Z', 'to': '2026-01-08T00:00:00Z'})
        assert r.status_code == 404

    def test_therapist_cannot_register_or_book(self, harbor):
        _, H = harbor
        t, _ = login(THERAPIST)
        r = t.post(B(H) + '/children', json={'firstName': 'TEST_X', 'lastName': 'TEST_Y', 'dateOfBirth': '2020-01-01', 'services': ['speech']})
        assert r.status_code == 403
        r = t.post(B(H) + '/appointments', json={'childId': str(uuid.uuid4()), 'membershipId': str(uuid.uuid4()), 'service': 'speech', 'startsAt': '2030-01-01T10:00:00Z', 'endsAt': '2030-01-01T11:00:00Z'})
        assert r.status_code == 403

    def test_range_limit(self, harbor):
        s, H = harbor
        r = s.get(B(H) + '/appointments', params={'from': '2026-01-01T00:00:00Z', 'to': '2026-03-01T00:00:00Z'})
        assert r.status_code == 422


# Guardian session: 403 on staff APIs; family payload has no emails / DOB
class TestGuardian:
    @pytest.fixture(scope='class')
    def parent(self):
        email = os.environ.get('TB_PARENT_EMAIL')
        pw = os.environ.get('TB_PARENT_PW')
        if not email or not pw:
            pytest.skip('no activated parent account supplied')
        return login(email, pw)

    def test_guardian_403_children(self, harbor, parent):
        _, H = harbor
        s, _ = parent
        assert s.get(B(H) + '/children').status_code == 403

    def test_family_no_emails_or_dob(self, harbor, parent):
        _, H = harbor
        s, _ = parent
        r = s.get(B(H) + '/family')
        assert r.status_code == 200
        body = r.text
        assert 'dateOfBirth' not in body and not re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', body)


# Seat limit: 2 used + 1 invite = 3/3, second invite refused
class TestSeats:
    def test_seat_limit_including_pending(self, harbor):
        s, H = harbor
        t = s.get(B(H) + '/trial').json()
        if t['therapistSeats']['used'] != 2:
            pytest.skip(f"seat precondition not met: {t['therapistSeats']}")
        created = []
        try:
            r1 = s.post(B(H) + '/invitations', json={'email': f'test-seat1-{RUN}@example.test', 'displayName': 'TEST_ Seat One', 'roles': ['THERAPIST']})
            assert r1.status_code in (200, 201), r1.text[:300]
            created.append(r1.json())
            assert s.get(B(H) + '/trial').json()['therapistSeats']['used'] == 3
            r2 = s.post(B(H) + '/invitations', json={'email': f'test-seat2-{RUN}@example.test', 'displayName': 'TEST_ Seat Two', 'roles': ['THERAPIST']})
            assert r2.status_code == 409 and '3 therapist seats' in r2.text
        finally:
            for inv in created:
                iid = inv.get('id') or inv.get('invitation', {}).get('id')
                s.post(B(H) + f'/invitations/{iid}/revoke', json={'reason': 'TEST_ cleanup'})
            assert s.get(B(H) + '/trial').json()['therapistSeats']['used'] == 2
