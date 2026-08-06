from fastapi import Depends, FastAPI, APIRouter, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Literal, Any
import uuid
from datetime import datetime, timezone
from urllib.parse import unquote
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.getenv('MONGO_URL', '')
db_name = os.getenv('DB_NAME', 'ghost_maze')
ADMIN_API_KEY = (os.getenv('ADMIN_API_KEY') or '').strip()

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

BACKEND_BUILD_ID = "companion-admin-2026-08-06-1"
COMPANION_DIR = ROOT_DIR / "companion"


@app.on_event("startup")
async def startup_db():
    if not mongo_url or client is None or db is None:
        raise RuntimeError("MONGO_URL environment variable is not set")
    try:
        await client.admin.command("ping")
        await db.scores.create_index([("mode", ASCENDING), ("score", DESCENDING), ("timestamp", ASCENDING)])
        await db.scores.create_index([("mode", ASCENDING), ("run_time_ms", ASCENDING), ("score", DESCENDING)])
        await db.promo_redemptions.create_index([("code", ASCENDING)])
        await db.promo_redemptions.create_index([("code", ASCENDING), ("player_id", ASCENDING)])
        await db.promo_code_counters.create_index([("redeemed_count", ASCENDING)])
        await db.news_items.create_index([("date", DESCENDING), ("updated_at", DESCENDING)])
        await db.promo_codes.create_index([("updated_at", DESCENDING)])
    except PyMongoError as exc:
        logger.exception("MongoDB startup check failed")
        raise RuntimeError("MongoDB is not reachable") from exc


async def require_admin(x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key")) -> None:
    """Protect companion write/list admin routes with a shared secret."""
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Admin API is not configured. Set ADMIN_API_KEY on the backend.",
        )
    provided = (x_admin_key or "").strip()
    if not provided or not secrets.compare_digest(provided, ADMIN_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")


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
# Ghost Maze: Leaderboards
# ============================================================

def utc_today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


class ScoreSubmission(BaseModel):
    player_name: str = Field(min_length=1)
    score: int = Field(ge=0)
    level: int = Field(ge=1)
    catches: int = Field(ge=0)
    theme_id: str = "classic"
    mode: Literal["classic", "speedrun", "timeattack"] = "classic"
    run_time_ms: Optional[int] = Field(default=None, ge=0)

    @field_validator("player_name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("player_name cannot be blank")
        keep = "".join(c for c in v if c.isalnum() or c in "-_.! ")
        return (keep or "GHOST")[:16]

    @model_validator(mode="after")
    def validate_mode_requirements(self):
        if self.mode == "speedrun" and (self.run_time_ms is None or self.run_time_ms <= 0):
            raise ValueError("run_time_ms must be greater than 0 for speedrun scores")
        return self


class ScoreEntry(BaseModel):
    id: str
    player_name: str
    score: int
    level: int
    catches: int
    theme_id: str
    mode: str
    run_time_ms: Optional[int] = None
    timestamp: datetime


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

DEFAULT_NEWS_ITEMS: list[dict[str, str]] = [
    {
        "title": "Production polish update",
        "date": "2026-07-26",
        "body": "Added an interactive tutorial practice flow, leaderboard submission status messaging, and promo redemption history in Settings.",
    },
    {
        "title": "QA fixes deployed",
        "date": "2026-07-20",
        "body": "Fixed total playtime/score tracking, aligned daily mission catches with lifetime catches, and added Android back confirmation for active runs.",
    },
    {
        "title": "Promo system live",
        "date": "2026-07-17",
        "body": "Enabled backend promo support with built-in codes and daily redemption windows. DAILY100 grants 100 coins once per day per player.",
    },
]


class NewsItem(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=120)
    date: str = Field(min_length=1, max_length=20)
    body: str = Field(min_length=1, max_length=1000)


class NewsItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    date: str = Field(default="", max_length=20)
    body: str = Field(min_length=1, max_length=1000)

    @field_validator("title", "body", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("date", mode="before")
    @classmethod
    def strip_date(cls, value: Any) -> str:
        return str(value or "").strip()


class NewsItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    date: Optional[str] = Field(default=None, max_length=20)
    body: Optional[str] = Field(default=None, min_length=1, max_length=1000)

    @field_validator("title", "body", "date", mode="before")
    @classmethod
    def strip_optional_text(cls, value: Any) -> Any:
        if value is None:
            return None
        return str(value).strip()


# Keep in sync with frontend/src/game/powerups.ts PowerUpId values.
KNOWN_POWER_UP_IDS: tuple[str, ...] = (
    "speedBoost",
    "teleport",
    "freeze",
    "shield",
    "fastRespawn",
    "pelletScatter",
    "key",
    "magnet",
    "reveal",
    "decoy",
    "rewind",
    "hardcoreRevive",
)
KNOWN_POWER_UP_ID_SET = set(KNOWN_POWER_UP_IDS)


def _normalize_power_ups(raw: Any) -> dict[str, int]:
    """Accept plain {powerUpId: qty} maps; drop unknowns and non-positive qty."""
    if not isinstance(raw, dict):
        return {}
    cleaned: dict[str, int] = {}
    for key, value in raw.items():
        power_id = str(key or "").strip()
        if power_id not in KNOWN_POWER_UP_ID_SET:
            continue
        try:
            qty = int(value)
        except (TypeError, ValueError):
            continue
        if qty > 0:
            cleaned[power_id] = min(qty, 999)
    return cleaned


class PromoAdminCreate(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    reward: int = Field(default=0, ge=0, description="Coin reward granted on redeem")
    power_ups: dict[str, int] = Field(default_factory=dict, description="Power-up id -> quantity")
    max_uses_total: Optional[int] = Field(default=None, ge=1, description="Total redemptions allowed across all players")
    max_uses_per_person: int = Field(default=1, ge=1, description="Redemptions allowed per player")
    active: bool = True
    daily: bool = False

    @field_validator("code", mode="before")
    @classmethod
    def sanitize_code(cls, value: Any) -> str:
        cleaned = str(value or "").strip().upper()
        cleaned = "".join(ch for ch in cleaned if ch.isalnum() or ch in ("-", "_"))
        if not cleaned:
            raise ValueError("code cannot be blank")
        return cleaned[:64]

    @field_validator("power_ups", mode="before")
    @classmethod
    def sanitize_power_ups(cls, value: Any) -> dict[str, int]:
        return _normalize_power_ups(value)


class PromoAdminUpdate(BaseModel):
    reward: Optional[int] = Field(default=None, ge=0)
    power_ups: Optional[dict[str, int]] = None
    max_uses_total: Optional[int] = Field(default=None, ge=1)
    max_uses_per_person: Optional[int] = Field(default=None, ge=1)
    active: Optional[bool] = None
    clear_max_uses_total: bool = False
    daily: Optional[bool] = None

    @field_validator("power_ups", mode="before")
    @classmethod
    def sanitize_power_ups(cls, value: Any) -> Any:
        if value is None:
            return None
        return _normalize_power_ups(value)


class PromoAdminItem(BaseModel):
    code: str
    reward: int = 0
    power_ups: dict[str, int] = Field(default_factory=dict)
    max_uses_total: Optional[int] = None
    max_uses_per_person: int = 1
    active: bool = True
    daily: bool = False
    redeemed_count: int = 0
    source: Literal["database", "built_in", "env"] = "database"
    editable: bool = True


def _normalize_news_item(item: Any) -> Optional[dict[str, str]]:
    if not isinstance(item, dict):
        return None
    title = str(item.get("title", "")).strip()
    date_raw = str(item.get("date", "")).strip()
    body = str(item.get("body", "")).strip()
    if not title or not body:
        return None
    if date_raw:
        normalized_date = date_raw[:20]
    else:
        normalized_date = datetime.now(timezone.utc).date().isoformat()
    news_id = str(item.get("id") or item.get("_id") or "").strip() or None
    payload = {
        "title": title[:120],
        "date": normalized_date,
        "body": body[:1000],
    }
    if news_id:
        payload["id"] = news_id
    return payload


def _load_env_news_items() -> list[dict[str, str]]:
    raw = (
        os.getenv("NEWS_ITEMS_JSON", "").strip()
        or os.getenv("NEWS_CHANGER_JSON", "").strip()
        or os.getenv("NEWSCHANGER_JSON", "").strip()
    )
    if not raw:
        return list(DEFAULT_NEWS_ITEMS)

    if raw.startswith("%5B") or raw.startswith("%7B"):
        raw = unquote(raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.exception("Invalid NEWS_ITEMS_JSON")
        return list(DEFAULT_NEWS_ITEMS)

    # Some env managers store JSON as a quoted JSON string.
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except json.JSONDecodeError:
            logger.exception("Invalid nested NEWS_ITEMS_JSON")
            return list(DEFAULT_NEWS_ITEMS)

    items: list[dict[str, str]] = []
    source = parsed
    if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
        source = parsed["items"]

    if isinstance(source, list):
        for item in source:
            normalized = _normalize_news_item(item)
            if normalized:
                items.append(normalized)

    return items if items else list(DEFAULT_NEWS_ITEMS)


async def _load_news_items() -> list[dict[str, str]]:
    """Prefer Mongo-backed news (editable via companion); fall back to env/defaults."""
    try:
        rows = await db.news_items.find({}).sort([("date", DESCENDING), ("updated_at", DESCENDING)]).to_list(200)
    except PyMongoError:
        logger.exception("Failed to load news from MongoDB")
        rows = []

    items: list[dict[str, str]] = []
    for row in rows:
        normalized = _normalize_news_item(
            {
                "id": row.get("_id"),
                "title": row.get("title"),
                "date": row.get("date"),
                "body": row.get("body"),
            }
        )
        if normalized:
            items.append(normalized)
    if items:
        return items
    return _load_env_news_items()


def _promo_reward_coins(promo: dict[str, Any]) -> int:
    rewards_raw = promo.get("rewards", {}) if isinstance(promo, dict) else {}
    if not isinstance(rewards_raw, dict):
        # Companion plain-text "reward" field may be stored at top level.
        top_level = promo.get("reward")
        if isinstance(top_level, (int, float)):
            return max(0, int(top_level))
        return 0
    coins = rewards_raw.get("coins", 0)
    if isinstance(coins, (int, float)):
        return max(0, int(coins))
    return 0


def _promo_reward_power_ups(promo: dict[str, Any]) -> dict[str, int]:
    if not isinstance(promo, dict):
        return {}
    rewards_raw = promo.get("rewards", {})
    if isinstance(rewards_raw, dict):
        nested = _normalize_power_ups(rewards_raw.get("powerUps"))
        if nested:
            return nested
    # Companion may also store a flat power_ups map.
    return _normalize_power_ups(promo.get("power_ups") or promo.get("powerUps"))


def _promo_max_per_player(promo: dict[str, Any]) -> int:
    raw = promo.get("max_per_player", promo.get("max_uses_per_person", 1))
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = 1
    return max(1, value)


def _promo_max_total(promo: dict[str, Any]) -> Optional[int]:
    raw = promo.get("max_redemptions", promo.get("max_uses_total"))
    if raw is None or raw == "":
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    return value if value >= 1 else None


def _serialize_promo_admin(code: str, promo: dict[str, Any], *, source: str, editable: bool) -> PromoAdminItem:
    redeemed = promo.get("redeemed_count", 0)
    try:
        redeemed_count = max(0, int(redeemed))
    except (TypeError, ValueError):
        redeemed_count = 0
    return PromoAdminItem(
        code=code,
        reward=_promo_reward_coins(promo),
        power_ups=_promo_reward_power_ups(promo),
        max_uses_total=_promo_max_total(promo),
        max_uses_per_person=_promo_max_per_player(promo),
        active=bool(promo.get("active", True)),
        daily=promo.get("redemption_period") == "daily",
        redeemed_count=redeemed_count,
        source=source,  # type: ignore[arg-type]
        editable=editable,
    )


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


def _parse_promo_expiry(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        normalized = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            logger.warning("Ignoring invalid promo expires_at value: %s", value)
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return None


@api_router.post("/scores", response_model=ScoreEntry)
async def submit_score(s: ScoreSubmission):
    entry = ScoreEntry(
        id=str(uuid.uuid4()),
        player_name=s.player_name,
        score=s.score,
        level=s.level,
        catches=s.catches,
        theme_id=s.theme_id,
        mode=s.mode,
        run_time_ms=s.run_time_ms,
        timestamp=datetime.now(timezone.utc),
    )

    await db.scores.insert_one(entry.model_dump())
    return entry


@api_router.get("/leaderboard", response_model=List[ScoreEntry])
async def leaderboard(
    mode: Literal["classic", "speedrun", "timeattack", "all"] = "classic",
    limit: int = Query(default=20, ge=1, le=100),
):
    query: dict = {}
    if mode != "all":
        query["mode"] = mode
    if mode == "speedrun":
        query["run_time_ms"] = {"$gt": 0}

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
    query: dict[str, Any] = {"mode": mode}
    if mode == "speedrun":
        query["run_time_ms"] = {"$gt": 0}
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
    stored_promo = None
    if promo is None:
        stored_promo = await promo_codes.find_one({"_id": code})
        if stored_promo is None:
            raise HTTPException(status_code=404, detail="Promo code not found")
        promo = stored_promo
    else:
        # Prefer DB override when companion edited a built-in/env code.
        stored_promo = await promo_codes.find_one({"_id": code})
        if stored_promo is not None:
            promo = stored_promo

    redemption_period = promo.get("redemption_period")
    redemption_window = utc_today_str() if redemption_period == "daily" else None
    max_per_player = _promo_max_per_player(promo)

    player_query: dict[str, Any] = {"code": code, "player_id": player_id}
    if redemption_window:
        player_query["redemption_window"] = redemption_window
    player_redeem_count = await redemptions.count_documents(player_query)
    if player_redeem_count >= max_per_player:
        if redemption_window:
            message = "Code already redeemed for this player today"
        elif max_per_player <= 1:
            message = "Code already redeemed for this player"
        else:
            message = "Player redemption limit reached for this code"
        raise HTTPException(status_code=409, detail=message)

    if promo.get("active", True) is False:
        raise HTTPException(status_code=400, detail="Promo code is inactive")

    exp = _parse_promo_expiry(promo.get("expires_at"))
    if exp is not None:
        now = datetime.now(timezone.utc)
        if now > exp:
            raise HTTPException(status_code=400, detail="Promo code expired")

    rewards_raw = promo.get("rewards", {}) if isinstance(promo, dict) else {}
    if not isinstance(rewards_raw, dict):
        rewards_raw = {}
    coins = rewards_raw.get("coins", promo.get("reward", 0))
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

    max_redemptions = _promo_max_total(promo)
    counter_reserved = False
    now = datetime.now(timezone.utc)
    if isinstance(max_redemptions, int):
        if stored_promo is None:
            try:
                counter = await db.promo_code_counters.find_one_and_update(
                    {"_id": code, "redeemed_count": {"$lt": max_redemptions}},
                    {
                        "$inc": {"redeemed_count": 1},
                        "$set": {"updated_at": now},
                        "$setOnInsert": {"created_at": now},
                    },
                    upsert=True,
                    return_document=ReturnDocument.AFTER,
                )
            except DuplicateKeyError:
                counter = None
            if counter is None:
                raise HTTPException(status_code=400, detail="Promo code redemption limit reached")
            counter_reserved = True
        else:
            update_result = await promo_codes.find_one_and_update(
                {"_id": code, "redeemed_count": {"$lt": max_redemptions}},
                {"$inc": {"redeemed_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                return_document=ReturnDocument.AFTER,
            )
            if update_result is None:
                raise HTTPException(status_code=400, detail="Promo code redemption limit reached")
            counter_reserved = True

    # Unique id even when a player may redeem more than once.
    redemption_id = (
        f"{code}:{player_id}:{redemption_window}:{player_redeem_count}"
        if redemption_window
        else f"{code}:{player_id}:{player_redeem_count}"
    )
    # Keep single-use legacy id shape for max_per_player == 1 and no window.
    if max_per_player == 1 and not redemption_window:
        redemption_id = f"{code}:{player_id}"
    elif max_per_player == 1 and redemption_window:
        redemption_id = f"{code}:{player_id}:{redemption_window}"

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
        if counter_reserved:
            target = promo_codes if stored_promo is not None else db.promo_code_counters
            await target.update_one({"_id": code}, {"$inc": {"redeemed_count": -1}, "$set": {"updated_at": now}})
        message = "Code already redeemed for this player today" if redemption_window else "Code already redeemed for this player"
        raise HTTPException(status_code=409, detail=message)

    return PromoRedeemResponse(
        code=code,
        message="Promo code redeemed",
        rewards=PromoRewards(coins=safe_coins, powerUps=safe_power_ups),
    )


@api_router.get("/news", response_model=List[NewsItem])
async def news_feed():
    return [NewsItem(**item) for item in await _load_news_items()]


# ============================================================
# Companion admin API (plain-text UI at /companion/)
# ============================================================

@api_router.get("/admin/health")
async def admin_health(_: None = Depends(require_admin)):
    return {
        "ok": True,
        "build": BACKEND_BUILD_ID,
        "admin_configured": bool(ADMIN_API_KEY),
    }


@api_router.get("/admin/news", response_model=List[NewsItem])
async def admin_list_news(_: None = Depends(require_admin)):
    rows = await db.news_items.find({}).sort([("date", DESCENDING), ("updated_at", DESCENDING)]).to_list(200)
    items: list[NewsItem] = []
    for row in rows:
        normalized = _normalize_news_item(
            {
                "id": row.get("_id"),
                "title": row.get("title"),
                "date": row.get("date"),
                "body": row.get("body"),
            }
        )
        if normalized:
            items.append(NewsItem(**normalized))
    if items:
        return items
    # Surface env/default fallback so the companion is never empty on first open.
    return [NewsItem(**item) for item in _load_env_news_items()]


@api_router.post("/admin/news", response_model=NewsItem)
async def admin_create_news(body: NewsItemCreate, _: None = Depends(require_admin)):
    normalized = _normalize_news_item(body.model_dump())
    if not normalized:
        raise HTTPException(status_code=400, detail="News item requires title and body")
    now = datetime.now(timezone.utc)
    news_id = str(uuid.uuid4())
    doc = {
        "_id": news_id,
        "title": normalized["title"],
        "date": normalized["date"],
        "body": normalized["body"],
        "created_at": now,
        "updated_at": now,
    }
    await db.news_items.insert_one(doc)
    return NewsItem(id=news_id, title=doc["title"], date=doc["date"], body=doc["body"])


@api_router.put("/admin/news/{news_id}", response_model=NewsItem)
async def admin_update_news(news_id: str, body: NewsItemUpdate, _: None = Depends(require_admin)):
    existing = await db.news_items.find_one({"_id": news_id})
    if existing is None:
        # Allow "editing" an env/default item by materializing it into Mongo.
        if not any([body.title, body.date, body.body]):
            raise HTTPException(status_code=404, detail="News item not found")
        raise HTTPException(
            status_code=404,
            detail="News item not found in database. Create it as a new item instead.",
        )

    updates: dict[str, Any] = {}
    if body.title is not None:
        if not body.title:
            raise HTTPException(status_code=400, detail="title cannot be blank")
        updates["title"] = body.title[:120]
    if body.body is not None:
        if not body.body:
            raise HTTPException(status_code=400, detail="body cannot be blank")
        updates["body"] = body.body[:1000]
    if body.date is not None:
        updates["date"] = (body.date[:20] if body.date else datetime.now(timezone.utc).date().isoformat())

    if not updates:
        return NewsItem(
            id=str(existing["_id"]),
            title=str(existing.get("title", "")),
            date=str(existing.get("date", "")),
            body=str(existing.get("body", "")),
        )

    updates["updated_at"] = datetime.now(timezone.utc)
    updated = await db.news_items.find_one_and_update(
        {"_id": news_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return NewsItem(
        id=str(updated["_id"]),
        title=str(updated.get("title", "")),
        date=str(updated.get("date", "")),
        body=str(updated.get("body", "")),
    )


@api_router.delete("/admin/news/{news_id}")
async def admin_delete_news(news_id: str, _: None = Depends(require_admin)):
    result = await db.news_items.delete_one({"_id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News item not found")
    return {"ok": True, "deleted": news_id}


@api_router.get("/admin/promos", response_model=List[PromoAdminItem])
async def admin_list_promos(_: None = Depends(require_admin)):
    items: dict[str, PromoAdminItem] = {}

    # Built-in / env codes first (read-only unless overridden in DB).
    for code, promo in _load_env_promo_codes().items():
        source = "built_in" if code in BUILT_IN_PROMO_CODES and code == promo.get("code", code) else "env"
        if code in BUILT_IN_PROMO_CODES:
            source = "built_in"
        items[code] = _serialize_promo_admin(code, promo, source=source, editable=False)

    rows = await db.promo_codes.find({}).to_list(500)
    for row in rows:
        code = str(row.get("_id") or row.get("code") or "").strip().upper()
        if not code:
            continue
        items[code] = _serialize_promo_admin(code, row, source="database", editable=True)

    return sorted(items.values(), key=lambda item: item.code)


@api_router.post("/admin/promos", response_model=PromoAdminItem)
async def admin_create_promo(body: PromoAdminCreate, _: None = Depends(require_admin)):
    code = body.code
    existing = await db.promo_codes.find_one({"_id": code}, {"_id": 1})
    if existing is not None:
        raise HTTPException(status_code=409, detail="Promo code already exists")
    power_ups = _normalize_power_ups(body.power_ups)
    if body.reward <= 0 and not power_ups:
        raise HTTPException(status_code=400, detail="Add coin reward and/or at least one power-up")

    now = datetime.now(timezone.utc)
    doc = {
        "_id": code,
        "code": code,
        "active": body.active,
        "max_redemptions": body.max_uses_total,
        "max_per_player": body.max_uses_per_person,
        "rewards": {"coins": body.reward, "powerUps": power_ups},
        "redemption_period": "daily" if body.daily else None,
        "redeemed_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.promo_codes.insert_one(doc)
    return _serialize_promo_admin(code, doc, source="database", editable=True)


@api_router.put("/admin/promos/{code}", response_model=PromoAdminItem)
async def admin_update_promo(code: str, body: PromoAdminUpdate, _: None = Depends(require_admin)):
    cleaned = str(code or "").strip().upper()
    cleaned = "".join(ch for ch in cleaned if ch.isalnum() or ch in ("-", "_"))
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid promo code")

    existing = await db.promo_codes.find_one({"_id": cleaned})
    now = datetime.now(timezone.utc)

    # Materialize built-in/env codes into Mongo when first edited.
    if existing is None:
        base = _load_env_promo_codes().get(cleaned)
        if base is None:
            raise HTTPException(status_code=404, detail="Promo code not found")
        existing = {
            "_id": cleaned,
            "code": cleaned,
            "active": base.get("active", True),
            "max_redemptions": _promo_max_total(base),
            "max_per_player": _promo_max_per_player(base),
            "rewards": {
                "coins": _promo_reward_coins(base),
                "powerUps": _promo_reward_power_ups(base),
            },
            "redemption_period": base.get("redemption_period"),
            "redeemed_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        await db.promo_codes.insert_one(existing)

    updates: dict[str, Any] = {"updated_at": now}
    unset_fields: dict[str, str] = {}

    if body.reward is not None:
        updates["rewards.coins"] = body.reward
    if body.power_ups is not None:
        # Replace the whole map so cleared plain-text fields remove old grants.
        updates["rewards.powerUps"] = _normalize_power_ups(body.power_ups)
    if body.max_uses_per_person is not None:
        updates["max_per_player"] = body.max_uses_per_person
    if body.active is not None:
        updates["active"] = body.active
    if body.clear_max_uses_total:
        unset_fields["max_redemptions"] = ""
    elif body.max_uses_total is not None:
        updates["max_redemptions"] = body.max_uses_total

    if body.daily is not None:
        if body.daily:
            updates["redemption_period"] = "daily"
        else:
            unset_fields["redemption_period"] = ""

    # Guard against wiping both coins and power-ups on update.
    if body.reward is not None or body.power_ups is not None:
        next_coins = body.reward if body.reward is not None else _promo_reward_coins(existing)
        next_power = (
            _normalize_power_ups(body.power_ups)
            if body.power_ups is not None
            else _promo_reward_power_ups(existing)
        )
        if next_coins <= 0 and not next_power:
            raise HTTPException(status_code=400, detail="Promo must keep coins and/or at least one power-up")

    update_doc: dict[str, Any] = {"$set": updates}
    if unset_fields:
        update_doc["$unset"] = unset_fields

    updated = await db.promo_codes.find_one_and_update(
        {"_id": cleaned},
        update_doc,
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return _serialize_promo_admin(cleaned, updated, source="database", editable=True)


@api_router.delete("/admin/promos/{code}")
async def admin_delete_promo(code: str, _: None = Depends(require_admin)):
    cleaned = str(code or "").strip().upper()
    cleaned = "".join(ch for ch in cleaned if ch.isalnum() or ch in ("-", "_"))
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid promo code")
    result = await db.promo_codes.delete_one({"_id": cleaned})
    if result.deleted_count == 0:
        if cleaned in _load_env_promo_codes():
            raise HTTPException(
                status_code=400,
                detail="Built-in/env promo codes cannot be deleted. Deactivate them instead.",
            )
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"ok": True, "deleted": cleaned}


app.include_router(api_router)

# Lightweight companion UI (plain HTML forms — not a store app).
if COMPANION_DIR.is_dir():
    app.mount("/companion", StaticFiles(directory=str(COMPANION_DIR), html=True), name="companion")


@app.get("/admin")
@app.get("/admin/")
async def companion_redirect():
    index = COMPANION_DIR / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="Companion app not found")
    return FileResponse(index)

# CORS — accept comma-separated origins from env, default to "*" for the
# casual game preview/deployment.
_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
_cors_origins = ["*"] if _cors_env in ("", "*") else [o.strip() for o in _cors_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=_cors_origins != ["*"],
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
