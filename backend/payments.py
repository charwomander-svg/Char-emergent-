"""
Ghost Maze — Stripe payments for Ghost Coin packs.

Architecture (account-less single-player game):
- Frontend sends an opaque `player_id` (UUID stored in AsyncStorage) when
  initiating checkout.
- Backend creates a Stripe Checkout Session with server-trusted pricing and
  stores a pending purchase record keyed by the Checkout Session ID.
- Fulfillment is idempotent and triggered by BOTH webhook events AND
  client-side status polling (whichever arrives first). MongoDB is used as
  the source of truth via the `purchases` collection's unique session_id.
- `success_url` embeds `{CHECKOUT_SESSION_ID}` so the frontend can poll
  `/api/checkout/session/{session_id}` to learn when coins are credited.
"""

from __future__ import annotations

import logging
import os
import asyncio
from datetime import datetime, timezone
from typing import Optional, Literal

import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pack catalog (server-trusted pricing — never trust client-supplied price)
# ---------------------------------------------------------------------------
class PackDef(BaseModel):
    id: str
    name: str
    price_cents: int
    currency: str = "usd"
    coins: int
    description: str
    badge: Optional[str] = None  # e.g. "BEST VALUE"


COIN_PACKS: dict[str, PackDef] = {
    "pack_small": PackDef(
        id="pack_small",
        name="Starter Coin Pack",
        price_cents=99,
        coins=100,
        description="100 Ghost Coins",
    ),
    "pack_medium": PackDef(
        id="pack_medium",
        name="Booster Coin Pack",
        price_cents=299,
        coins=400,
        description="400 Ghost Coins",
        badge="POPULAR",
    ),
    "pack_large": PackDef(
        id="pack_large",
        name="Big Coin Pack",
        price_cents=499,
        coins=1000,
        description="1000 Ghost Coins",
        badge="BEST VALUE",
    ),
    "pack_xl": PackDef(
        id="pack_xl",
        name="Mega Coin Pack",
        price_cents=999,
        coins=2500,
        description="2500 Ghost Coins",
        badge="MEGA DEAL",
    ),
}


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class CreateCheckoutRequest(BaseModel):
    pack_id: str = Field(..., description="One of pack_small / pack_medium / pack_large / pack_xl")
    player_id: str = Field(..., min_length=4, max_length=128)
    success_origin: Optional[str] = Field(
        None, description="Frontend origin to redirect to after payment. e.g. https://example.com"
    )


class CreateCheckoutResponse(BaseModel):
    session_id: str
    checkout_url: str
    pack_id: str
    coins: int
    amount_cents: int
    currency: str


class CheckoutStatusResponse(BaseModel):
    session_id: str
    status: Literal["pending", "complete", "expired", "failed"]
    payment_status: Optional[str] = None
    coins_granted: bool
    coins: Optional[int] = None
    pack_id: Optional[str] = None
    player_id: Optional[str] = None
    player_total_coins: Optional[int] = None


class PackInfo(BaseModel):
    id: str
    name: str
    price_cents: int
    currency: str
    coins: int
    description: str
    badge: Optional[str] = None


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
def init_stripe() -> None:
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        logger.warning(
            "STRIPE_API_KEY not configured — checkout endpoints will return 503"
        )
        return
    stripe.api_key = api_key
    # When using the Emergent-provided test key, route requests through the
    # Emergent integration proxy (mirrors emergentintegrations.payments.stripe).
    if "sk_test_emergent" in api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
        logger.info("Stripe configured via Emergent integration proxy")
    else:
        logger.info("Stripe configured with direct API key")


def get_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Build an APIRouter wired to a Motor database for purchase/coin storage."""
    router = APIRouter(prefix="/checkout", tags=["payments"])

    purchases = db.purchases  # _id = stripe session id
    players = db.players      # _id = player_id

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------
    async def _fulfill_session(session_obj: dict) -> Optional[dict]:
        """
        Idempotent fulfillment: credits coins to the player exactly once per
        Stripe Checkout Session ID. Returns the purchase document if fulfilled
        (either now or previously), or None if not yet paid.
        """
        session_id = session_obj["id"]
        payment_status = session_obj.get("payment_status")
        if payment_status != "paid":
            return None

        # Idempotency: if a "completed" purchase doc exists, return it untouched.
        # Projection limits payload to only the fields we read downstream.
        _purchase_proj = {
            "status": 1, "player_id": 1, "pack_id": 1, "coins": 1,
            "amount_cents": 1, "currency": 1, "fulfilled_at": 1, "created_at": 1,
        }
        existing = await purchases.find_one({"_id": session_id}, _purchase_proj)
        if existing and existing.get("status") == "completed":
            return existing

        metadata = session_obj.get("metadata") or {}
        player_id = metadata.get("player_id") or session_obj.get("client_reference_id")
        pack_id = metadata.get("pack_id") or (existing or {}).get("pack_id")
        try:
            coins = int(metadata.get("coins", 0) or 0)
        except (TypeError, ValueError):
            coins = 0
        if coins <= 0 and existing:
            coins = int(existing.get("coins", 0) or 0)

        if not player_id or not pack_id or coins <= 0:
            logger.error(
                "Cannot fulfill session %s — missing data player_id=%s pack_id=%s coins=%s",
                session_id, player_id, pack_id, coins,
            )
            return None

        now = datetime.now(timezone.utc)

        # Atomically flip a pending row to completed. The filter `status != "completed"`
        # ensures only the FIRST writer succeeds; concurrent webhook+poll calls won't
        # double-credit the player.
        result = await purchases.update_one(
            {"_id": session_id, "status": {"$ne": "completed"}},
            {
                "$set": {
                    "player_id": player_id,
                    "pack_id": pack_id,
                    "coins": coins,
                    "amount_cents": session_obj.get("amount_total"),
                    "currency": session_obj.get("currency"),
                    "status": "completed",
                    "fulfilled_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

        # Only credit player when we actually transitioned the row.
        credited = result.modified_count > 0 or (result.upserted_id is not None)
        if credited:
            await players.update_one(
                {"_id": player_id},
                {
                    "$inc": {"coins": coins, "lifetime_purchased_coins": coins},
                    "$setOnInsert": {"created_at": now},
                    "$set": {"updated_at": now},
                },
                upsert=True,
            )
            logger.info(
                "Fulfilled session %s — granted %d coins to player %s",
                session_id, coins, player_id,
            )

        return await purchases.find_one({"_id": session_id}, _purchase_proj)

    async def _player_total(player_id: str) -> Optional[int]:
        if not player_id:
            return None
        doc = await players.find_one({"_id": player_id}, {"coins": 1})
        if not doc:
            return 0
        return int(doc.get("coins", 0))

    # -----------------------------------------------------------------------
    # Routes
    # -----------------------------------------------------------------------
    @router.get("/packs", response_model=list[PackInfo])
    async def list_packs():
        return [PackInfo(**p.model_dump()) for p in COIN_PACKS.values()]

    @router.post("/session", response_model=CreateCheckoutResponse)
    async def create_checkout_session(body: CreateCheckoutRequest, request: Request):
        pack = COIN_PACKS.get(body.pack_id)
        if not pack:
            raise HTTPException(status_code=400, detail="Unknown pack_id")

        if not stripe.api_key:
            raise HTTPException(status_code=503, detail="Payments not configured")

        # Compute redirect origin: prefer client-supplied (web), fall back to
        # Origin/Referer header, then to EXPO_PUBLIC_BACKEND_URL env (same
        # ingress hosts both frontend and backend in this stack).
        origin = (
            body.success_origin
            or request.headers.get("origin")
            or request.headers.get("referer", "").rsplit("/", 1)[0]
            or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
            or ""
        ).rstrip("/")
        if not origin:
            raise HTTPException(
                status_code=400,
                detail="Cannot determine redirect origin (provide success_origin)",
            )

        success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/checkout/cancel"

        try:
            session = await asyncio.to_thread(
                stripe.checkout.Session.create,
                mode="payment",
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": pack.currency,
                            "product_data": {
                                "name": pack.name,
                                "description": pack.description,
                            },
                            "unit_amount": pack.price_cents,
                        },
                        "quantity": 1,
                    }
                ],
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=body.player_id,
                metadata={
                    "player_id": body.player_id,
                    "pack_id": pack.id,
                    "coins": str(pack.coins),
                },
            )
        except stripe.error.StripeError as e:
            logger.exception("Stripe error creating session")
            raise HTTPException(status_code=502, detail=f"Stripe error: {e.user_message or str(e)}")

        # Record a pending purchase so we can list user history even before fulfillment
        await purchases.update_one(
            {"_id": session["id"]},
            {
                "$setOnInsert": {
                    "_id": session["id"],
                    "player_id": body.player_id,
                    "pack_id": pack.id,
                    "coins": pack.coins,
                    "amount_cents": pack.price_cents,
                    "currency": pack.currency,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )

        return CreateCheckoutResponse(
            session_id=session["id"],
            checkout_url=session["url"],
            pack_id=pack.id,
            coins=pack.coins,
            amount_cents=pack.price_cents,
            currency=pack.currency,
        )

    @router.get("/session/{session_id}", response_model=CheckoutStatusResponse)
    async def get_session_status(session_id: str):
        """
        Client-side polling endpoint. Also acts as a fulfillment fallback if
        webhooks haven't fired yet (idempotent).
        """
        if not stripe.api_key:
            raise HTTPException(status_code=503, detail="Payments not configured")

        try:
            session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
        except stripe.error.InvalidRequestError:
            raise HTTPException(status_code=404, detail="Unknown session_id")
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=502, detail=str(e))

        # If paid but not yet credited, do it now (idempotent).
        purchase = None
        if session.get("payment_status") == "paid":
            purchase = await _fulfill_session(session.to_dict())

        if purchase is None:
            purchase = await purchases.find_one({"_id": session_id})

        coins_granted = bool(purchase and purchase.get("status") == "completed")

        # Map Stripe statuses to our coarse buckets
        st = session.get("status")  # 'open' | 'complete' | 'expired'
        ps = session.get("payment_status")  # 'paid' | 'unpaid' | 'no_payment_required'
        if st == "complete" and ps == "paid":
            status_label = "complete"
        elif st == "expired":
            status_label = "expired"
        elif ps == "unpaid" and st == "complete":
            status_label = "failed"
        else:
            status_label = "pending"

        player_id = (purchase or {}).get("player_id") or session.get("client_reference_id")
        player_total = await _player_total(player_id) if player_id else None

        return CheckoutStatusResponse(
            session_id=session_id,
            status=status_label,
            payment_status=ps,
            coins_granted=coins_granted,
            coins=(purchase or {}).get("coins") if coins_granted else None,
            pack_id=(purchase or {}).get("pack_id"),
            player_id=player_id,
            player_total_coins=player_total,
        )

    @router.get("/player/{player_id}/balance")
    async def get_player_balance(player_id: str):
        total = await _player_total(player_id)
        return {"player_id": player_id, "coins": total or 0}

    # -----------------------------------------------------------------------
    # Webhook (optional but recommended). Configure STRIPE_WEBHOOK_SECRET
    # in the env to enable signature verification.
    # -----------------------------------------------------------------------
    @router.post("/webhook", include_in_schema=False)
    async def stripe_webhook(
        request: Request,
        stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    ):
        if not stripe.api_key:
            raise HTTPException(status_code=503, detail="Payments not configured")

        payload = await request.body()
        webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

        try:
            if webhook_secret:
                event = stripe.Webhook.construct_event(
                    payload=payload,
                    sig_header=stripe_signature or "",
                    secret=webhook_secret,
                )
            else:
                api_key = os.environ.get("STRIPE_API_KEY", "")
                if api_key and not api_key.startswith("sk_test"):
                    raise HTTPException(status_code=400, detail="Webhook signature required")
                # Dev mode: accept unsigned events. NOT for production.
                import json
                event = json.loads(payload.decode("utf-8"))
                logger.warning("STRIPE_WEBHOOK_SECRET not set; accepting unsigned webhook")
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.warning("Invalid webhook payload: %s", e)
            raise HTTPException(status_code=400, detail="Invalid webhook")

        event_type = event.get("type")
        obj = event.get("data", {}).get("object", {})

        if event_type == "checkout.session.completed":
            # Need to retrieve full session to get up-to-date payment_status
            try:
                session = await asyncio.to_thread(stripe.checkout.Session.retrieve, obj["id"])
                await _fulfill_session(session.to_dict())
            except Exception as e:
                logger.exception("Webhook fulfillment failed: %s", e)
                raise HTTPException(status_code=500, detail="Webhook fulfillment failed")

        return {"received": True}

    return router
