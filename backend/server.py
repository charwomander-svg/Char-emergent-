from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
import hashlib
import json
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Any
import uuid
from datetime import datetime, timezone, date

from payments import get_router as get_payments_router, init_stripe


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.getenv('MONGO_URL', '')
db_name = os.getenv('DB_NAME', 'ghost_maze')

# Initialize DB connection at module load if env vars are present; if
# MONGO_URL is absent the server will still import cleanly and the startup
# event below will surface a clear error.
if mongo_url:
    client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
else:
    client = None  # type: ignore[assignment]
    db = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

BACKEND_BUILD_ID = "promo-codes-2026-07-23"


@app.on_event("startup")
async def startup_db():
    if not mongo_url:
        raise RuntimeError("MONGO_URL environment variable is not set")


# ============================================================
# Existing status models (preserved)
# ============================================================
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@app.get("/")
async def index():
    return {"status": "ok", "service": "Ghost Maze API", "docs": "/api/"}


@api_router.get("/")
async def root():
    return {"message": "Ghost Maze API", "build": BACKEND_BUILD_ID}


@api_router.get("/version")
async def version():
    return {
        "build": BACKEND_BUILD_ID,
        "built_in_promo_codes": sorted(BUILT_IN_PROMO_CODES.keys()),
    }


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(limit: int = Query(100, ge=1, le=500)):
    rows = (
        await db.status_checks.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(limit)
    )
    return [StatusCheck(**r) for r in rows]


# ============================================================
# Ghost Maze: Leaderboard + Daily Challenge
# ============================================================

def utc_today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def seed_from_date(d: str) -> int:
    """Derive deterministic 32-bit seed from a date string."""
    h = hashlib.sha256(d.encode("utf-8")).digest()
    return int.from_bytes(h[:4], byteorder="big") & 0x7FFFFFFF


class ScoreSubmission(BaseModel):
    player_name: str = Field(min_length=1)
    score: int = Field(ge=0)
    level: int = Field(ge=1)
    catches: int = Field(ge=0)
    theme_id: str = "classic"
    mode: Literal["classic", "daily", "speedrun", "timeattack"] = "classic"
    daily_seed_date: Optional[str] = None  # required if mode==daily
    run_time_ms: Optional[int] = Field(default=None, ge=0)

    @field_validator("player_name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("player_name cannot be blank")
        keep = "".join(c for c in v if c.isalnum() or c in "-_.! ")
        return (keep or "GHOST")[:16]


class ScoreEntry(BaseModel):
    id: str
    player_name: str
    score: int
    level: int
    catches: int
    theme_id: str
    mode: str
    daily_seed_date: Optional[str] = None
    run_time_ms: Optional[int] = None
    timestamp: datetime


class DailySeedInfo(BaseModel):
    seed_date: str
    seed: int


class LeaderboardSummary(BaseModel):
    overall_best: Optional[ScoreEntry] = None
    level_bests: List[ScoreEntry]
    aggregate_bests: List[ScoreEntry] = []


class PromoRedeemRequest(BaseModel):
    player_id: str = Field(min_length=4, max_length=128)
    code: str = Field(min_length=1, max_length=64)

    @field_validator("player_id", mode="before")
    @classmethod
    def sanitize_player_id(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("player_id cannot be blank")
        return cleaned[:128]

    @field_validator("code", mode="before")
    @classmethod
    def sanitize_code(cls, value: str) -> str:
        cleaned = (value or "").strip().upper()
        cleaned = "".join(ch for ch in cleaned if ch.isalnum() or ch in ("-", "_"))
        if not cleaned:
            raise ValueError("code cannot be blank")
        return cleaned[:64]


class PromoRewards(BaseModel):
    coins: int = 0
    powerUps: dict[str, int] = Field(default_factory=dict)


class PromoRedeemResponse(BaseModel):
    code: str
    message: str
    rewards: PromoRewards


_PROMO_CODES_CACHE: Optional[dict[str, dict[str, Any]]] = None

BUILT_IN_PROMO_CODES: dict[str, dict[str, Any]] = {
    "CHAR6000": {
        "code": "CHAR6000",
        "active": True,
        "max_redemptions": 5,
        "rewards": {"coins": 6000},
    },
    "DAILY100": {
        "code": "DAILY100",
        "active": True,
        "redemption_period": "daily",
        "rewards": {"coins": 100},
    },
}


def _load_env_promo_codes() -> dict[str, dict[str, Any]]:
    global _PROMO_CODES_CACHE
    if _PROMO_CODES_CACHE is not None:
        return _PROMO_CODES_CACHE

    raw = os.getenv("PROMO_CODES_JSON", "").strip()
    if not raw:
        _PROMO_CODES_CACHE = BUILT_IN_PROMO_CODES
        return _PROMO_CODES_CACHE

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.exception("Invalid PROMO_CODES_JSON")
        _PROMO_CODES_CACHE = BUILT_IN_PROMO_CODES
        return _PROMO_CODES_CACHE

    codes: dict[str, dict[str, Any]] = {}
    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            code = str(item.get("code", "")).strip().upper()
            code = "".join(ch for ch in code if ch.isalnum() or ch in ("-", "_"))
            if not code:
                continue
            codes[code] = item
    elif isinstance(parsed, dict):
        for raw_code, item in parsed.items():
            if not isinstance(item, dict):
                continue
            code = str(raw_code).strip().upper()
            code = "".join(ch for ch in code if ch.isalnum() or ch in ("-", "_"))
            if not code:
                continue
            item["code"] = code
            codes[code] = item

    _PROMO_CODES_CACHE = {**BUILT_IN_PROMO_CODES, **codes}
    return _PROMO_CODES_CACHE


@api_router.get("/daily-seed", response_model=DailySeedInfo)
async def daily_seed():
    d = utc_today_str()
    return DailySeedInfo(seed_date=d, seed=seed_from_date(d))


@api_router.post("/scores", response_model=ScoreEntry)
async def submit_score(s: ScoreSubmission):
    if s.mode == "daily":
        # Use today's seed date if not provided, but reject mismatch
        today = utc_today_str()
        if s.daily_seed_date and s.daily_seed_date != today:
            raise HTTPException(
                status_code=400,
                detail=f"Daily score must be for today ({today}); got {s.daily_seed_date}",
            )
        s.daily_seed_date = today

    entry = ScoreEntry(
        id=str(uuid.uuid4()),
        player_name=s.player_name,
        score=s.score,
        level=s.level,
        catches=s.catches,
        theme_id=s.theme_id,
        mode=s.mode,
        daily_seed_date=s.daily_seed_date,
        run_time_ms=s.run_time_ms,
        timestamp=datetime.now(timezone.utc),
    )

    await db.scores.insert_one(entry.model_dump())
    return entry


@api_router.get("/leaderboard", response_model=List[ScoreEntry])
async def leaderboard(
    mode: Literal["classic", "daily", "speedrun", "timeattack", "all"] = "classic",
    daily_seed_date: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    query: dict = {}
    if mode != "all":
        query["mode"] = mode
    if mode == "daily":
        query["daily_seed_date"] = daily_seed_date or utc_today_str()

    sort_spec = (
        [("run_time_ms", 1), ("score", -1), ("timestamp", 1)]
        if mode == "speedrun"
        else [("score", -1), ("timestamp", 1)]
    )
    rows = await db.scores.find(query, {"_id": 0}).sort(sort_spec).to_list(limit)
    return [ScoreEntry(**r) for r in rows]


@api_router.get("/leaderboard-summary", response_model=LeaderboardSummary)
async def leaderboard_summary(
    mode: Literal["classic", "speedrun", "timeattack"] = "classic",
):
    query = {"mode": mode}
    rows = await db.scores.find(query, {"_id": 0}).to_list(length=None)
    entries = [ScoreEntry(**r) for r in rows]

    per_player_level_best: dict[str, dict[int, ScoreEntry]] = {}
    for entry in entries:
        player_levels = per_player_level_best.setdefault(entry.player_name, {})
        existing = player_levels.get(entry.level)
        if mode == "speedrun":
            if existing is None:
                if (entry.run_time_ms or 0) > 0:
                    player_levels[entry.level] = entry
                continue
            existing_time = existing.run_time_ms or 0
            next_time = entry.run_time_ms or 0
            if next_time > 0 and (
                existing_time <= 0
                or next_time < existing_time
                or (next_time == existing_time and entry.score > existing.score)
                or (
                    next_time == existing_time
                    and entry.score == existing.score
                    and entry.timestamp < existing.timestamp
                )
            ):
                player_levels[entry.level] = entry
        else:
            if existing is None or entry.score > existing.score or (
                entry.score == existing.score and entry.timestamp < existing.timestamp
            ):
                player_levels[entry.level] = entry

    aggregate_bests: List[ScoreEntry] = []
    if mode in ("classic", "speedrun"):
        for player_name, level_map in per_player_level_best.items():
            if len(level_map) < 50:
                continue
            player_entries = [level_map[level] for level in sorted(level_map.keys())]
            if mode == "speedrun":
                total_run_time = sum((entry.run_time_ms or 0) for entry in player_entries)
                if total_run_time <= 0:
                    continue
                aggregate_bests.append(
                    ScoreEntry(
                        id=f"aggregate-speedrun-{player_name}",
                        player_name=player_name,
                        score=sum(entry.score for entry in player_entries),
                        level=50,
                        catches=sum(entry.catches for entry in player_entries),
                        theme_id="aggregate",
                        mode=mode,
                        run_time_ms=total_run_time,
                        timestamp=min(entry.timestamp for entry in player_entries),
                    )
                )
            else:
                aggregate_bests.append(
                    ScoreEntry(
                        id=f"aggregate-classic-{player_name}",
                        player_name=player_name,
                        score=sum(entry.score for entry in player_entries),
                        level=50,
                        catches=sum(entry.catches for entry in player_entries),
                        theme_id="aggregate",
                        mode=mode,
                        run_time_ms=None,
                        timestamp=min(entry.timestamp for entry in player_entries),
                    )
                )

    if mode == "speedrun":
        by_level: dict[int, ScoreEntry] = {}
        for entry in entries:
            existing = by_level.get(entry.level)
            if existing is None:
                by_level[entry.level] = entry
                continue
            existing_time = existing.run_time_ms or 0
            next_time = entry.run_time_ms or 0
            if existing_time <= 0 or (
                next_time > 0
                and (
                    next_time < existing_time
                    or (next_time == existing_time and entry.score > existing.score)
                )
            ):
                by_level[entry.level] = entry

        level_bests = [by_level[level] for level in sorted(by_level.keys())]
        aggregate_bests.sort(
            key=lambda entry: (
                entry.run_time_ms or 10**18,
                -entry.score,
                entry.timestamp,
            )
        )
        return LeaderboardSummary(
            overall_best=None,
            level_bests=level_bests,
            aggregate_bests=aggregate_bests[:5],
        )

    by_level: dict[int, ScoreEntry] = {}
    overall_best: Optional[ScoreEntry] = None
    for entry in entries:
        existing = by_level.get(entry.level)
        if existing is None or entry.score > existing.score or (
            entry.score == existing.score and entry.timestamp < existing.timestamp
        ):
            by_level[entry.level] = entry

        if overall_best is None or entry.score > overall_best.score or (
            entry.score == overall_best.score and entry.timestamp < overall_best.timestamp
        ):
            overall_best = entry

    level_bests = [by_level[level] for level in sorted(by_level.keys())]
    aggregate_bests.sort(key=lambda entry: (-entry.score, entry.timestamp))
    return LeaderboardSummary(
        overall_best=overall_best,
        level_bests=level_bests,
        aggregate_bests=aggregate_bests[:5],
    )


@api_router.post("/promo/redeem", response_model=PromoRedeemResponse)
async def promo_redeem(body: PromoRedeemRequest):
    code = body.code
    player_id = body.player_id

    redemptions = db.promo_redemptions
    promo_codes = db.promo_codes

    promo = _load_env_promo_codes().get(code)
    if promo is None:
        promo = await promo_codes.find_one({"_id": code})
        if promo is None:
            raise HTTPException(status_code=404, detail="Promo code not found")

    redemption_period = promo.get("redemption_period")
    redemption_window = utc_today_str() if redemption_period == "daily" else None
    redemption_id = f"{code}:{player_id}:{redemption_window}" if redemption_window else f"{code}:{player_id}"
    already = await redemptions.find_one({"_id": redemption_id}, {"_id": 1})
    if already:
        message = "Code already redeemed for this player today" if redemption_window else "Code already redeemed for this player"
        raise HTTPException(status_code=409, detail=message)

    if promo.get("active", True) is False:
        raise HTTPException(status_code=400, detail="Promo code is inactive")

    expires_at = promo.get("expires_at")
    if isinstance(expires_at, datetime):
        now = datetime.now(timezone.utc)
        exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        if now > exp:
            raise HTTPException(status_code=400, detail="Promo code expired")

    rewards_raw = promo.get("rewards", {}) if isinstance(promo, dict) else {}
    if not isinstance(rewards_raw, dict):
        rewards_raw = {}
    coins = rewards_raw.get("coins", 0)
    power_ups = rewards_raw.get("powerUps", {})

    safe_coins = max(0, int(coins)) if isinstance(coins, (int, float)) else 0
    safe_power_ups: dict[str, int] = {}
    if isinstance(power_ups, dict):
        for key, value in power_ups.items():
            k = str(key).strip()
            if not k:
                continue
            qty = int(value) if isinstance(value, (int, float)) else 0
            if qty > 0:
                safe_power_ups[k] = qty

    if safe_coins <= 0 and not safe_power_ups:
        raise HTTPException(status_code=400, detail="Promo code has no rewards configured")

    max_redemptions = promo.get("max_redemptions")
    redeemed_count = int(promo.get("redeemed_count", 0) or 0)
    if isinstance(max_redemptions, int):
        if redeemed_count >= max_redemptions:
            raise HTTPException(status_code=400, detail="Promo code redemption limit reached")
        if await promo_codes.find_one({"_id": code}, {"_id": 1}) is None:
            total = await redemptions.count_documents({"code": code})
            if total >= max_redemptions:
                raise HTTPException(status_code=400, detail="Promo code redemption limit reached")
        else:
            update_result = await promo_codes.update_one(
                {"_id": code, "redeemed_count": redeemed_count},
                {"$inc": {"redeemed_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
            )
            if update_result.matched_count == 0:
                raise HTTPException(status_code=409, detail="Promo redemption conflict, please retry")

    now = datetime.now(timezone.utc)
    try:
        await redemptions.insert_one(
            {
                "_id": redemption_id,
                "code": code,
                "player_id": player_id,
                "redemption_window": redemption_window,
                "rewards": {"coins": safe_coins, "powerUps": safe_power_ups},
                "created_at": now,
            }
        )
    except DuplicateKeyError:
        message = "Code already redeemed for this player today" if redemption_window else "Code already redeemed for this player"
        raise HTTPException(status_code=409, detail=message)

    return PromoRedeemResponse(
        code=code,
        message="Promo code redeemed",
        rewards=PromoRewards(coins=safe_coins, powerUps=safe_power_ups),
    )


app.include_router(api_router)

# Stripe payments router (Coin pack purchases)
init_stripe()
payments_router = get_payments_router(db)
app.include_router(payments_router, prefix="/api")

# CORS — accept comma-separated origins from env, default to "*" for the
# casual game preview/deployment.
_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
_cors_origins = ["*"] if _cors_env in ("", "*") else [o.strip() for o in _cors_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
