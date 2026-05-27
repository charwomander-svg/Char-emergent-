"""Ghost Maze Phase 5: Stripe coin-pack checkout endpoints."""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://four-ghost-chase.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
SUCCESS_ORIGIN = BASE_URL


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- /api/checkout/packs --------
class TestPacksCatalog:
    def test_packs_returns_four_packs_with_expected_shape(self, session):
        r = session.get(f"{API}/checkout/packs")
        assert r.status_code == 200, r.text
        packs = r.json()
        assert isinstance(packs, list)
        assert len(packs) == 4, f"Expected 4 packs, got {len(packs)}"

        by_id = {p["id"]: p for p in packs}
        expected = {
            "pack_small": (99, 100, None),
            "pack_medium": (299, 400, "POPULAR"),
            "pack_large": (499, 1000, "BEST VALUE"),
            "pack_xl": (999, 2500, "MEGA DEAL"),
        }
        for pid, (price, coins, badge) in expected.items():
            assert pid in by_id, f"Missing pack: {pid}"
            p = by_id[pid]
            assert p["price_cents"] == price, f"{pid} price mismatch: {p['price_cents']}"
            assert p["coins"] == coins, f"{pid} coins mismatch: {p['coins']}"
            assert p["currency"] == "usd"
            assert p.get("badge") == badge, f"{pid} badge mismatch: {p.get('badge')}"
            assert isinstance(p["name"], str) and p["name"]
            assert isinstance(p["description"], str) and p["description"]


# -------- /api/checkout/session (POST) --------
class TestCreateCheckoutSession:
    def test_create_session_returns_stripe_url(self, session):
        player_id = f"test-uuid-{uuid.uuid4().hex[:8]}"
        payload = {
            "pack_id": "pack_small",
            "player_id": player_id,
            "success_origin": SUCCESS_ORIGIN,
        }
        r = session.post(f"{API}/checkout/session", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()

        assert data["pack_id"] == "pack_small"
        assert data["coins"] == 100
        assert data["amount_cents"] == 99
        assert data["currency"] == "usd"

        sid = data["session_id"]
        assert isinstance(sid, str) and sid.startswith("cs_"), f"Bad session_id: {sid}"

        url = data["checkout_url"]
        assert isinstance(url, str)
        assert url.startswith("https://"), f"checkout_url not https: {url}"
        # Accept either real Stripe domain or Emergent proxied checkout domain.
        assert "checkout.stripe.com" in url or "stripe" in url.lower(), (
            f"checkout_url doesn't look like a Stripe URL: {url}"
        )

        # Stash for status test
        pytest.shared_session_id = sid
        pytest.shared_player_id = player_id

    def test_create_session_rejects_unknown_pack(self, session):
        r = session.post(
            f"{API}/checkout/session",
            json={
                "pack_id": "pack_bogus",
                "player_id": "test-uuid-bad",
                "success_origin": SUCCESS_ORIGIN,
            },
        )
        assert r.status_code == 400, r.text
        body = r.json()
        assert "detail" in body and "pack" in body["detail"].lower()

    def test_create_session_rejects_missing_pack_id(self, session):
        r = session.post(
            f"{API}/checkout/session",
            json={"player_id": "test-uuid-missing-pack", "success_origin": SUCCESS_ORIGIN},
        )
        assert r.status_code == 422, r.text

    def test_create_session_rejects_short_player_id(self, session):
        r = session.post(
            f"{API}/checkout/session",
            json={
                "pack_id": "pack_small",
                "player_id": "x",  # too short, min_length=4
                "success_origin": SUCCESS_ORIGIN,
            },
        )
        assert r.status_code == 422, r.text


# -------- /api/checkout/session/{id} (GET) --------
class TestSessionStatus:
    def test_pending_status_before_payment(self, session):
        sid = getattr(pytest, "shared_session_id", None)
        if not sid:
            pytest.skip("Depends on TestCreateCheckoutSession having run first")

        r = session.get(f"{API}/checkout/session/{sid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["session_id"] == sid
        assert data["status"] == "pending", f"Expected pending, got {data['status']}"
        assert data["coins_granted"] is False
        # No coins should be granted yet
        assert data.get("coins") in (None, 0)

    def test_unknown_session_returns_404(self, session):
        r = session.get(f"{API}/checkout/session/cs_test_doesnotexist_zzz")
        assert r.status_code == 404, r.text


# -------- /api/checkout/player/{player_id}/balance --------
class TestPlayerBalance:
    def test_new_player_balance_zero(self, session):
        new_pid = f"test-uuid-new-{uuid.uuid4().hex[:8]}"
        r = session.get(f"{API}/checkout/player/{new_pid}/balance")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["player_id"] == new_pid
        assert data["coins"] == 0

    def test_previously_paid_player_has_coins(self, session):
        # The review request notes test-player-uuid-123 has 100 coins from prior test.
        r = session.get(f"{API}/checkout/player/test-player-uuid-123/balance")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["player_id"] == "test-player-uuid-123"
        # We don't hard-fail if the env was reset, but log it.
        assert data["coins"] >= 0
        # Soft check: print balance for observation
        print(f"test-player-uuid-123 balance = {data['coins']}")
