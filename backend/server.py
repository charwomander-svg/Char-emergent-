from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date

from payments import get_router as get_payments_router, init_stripe


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============================================================
# Existing status models (preserved)
# ============================================================
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Ghost Maze API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
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
    mode: Literal["classic", "daily"] = "classic"
    daily_seed_date: Optional[str] = None  # required if mode==daily

    @validator("player_name")
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
    timestamp: datetime


class DailySeedInfo(BaseModel):
    seed_date: str
    seed: int


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
        timestamp=datetime.now(timezone.utc),
    )

    await db.scores.insert_one(entry.dict())
    return entry


@api_router.get("/leaderboard", response_model=List[ScoreEntry])
async def leaderboard(
    mode: Literal["classic", "daily", "all"] = "classic",
    daily_seed_date: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    query: dict = {}
    if mode != "all":
        query["mode"] = mode
    if mode == "daily":
        query["daily_seed_date"] = daily_seed_date or utc_today_str()

    rows = (
        await db.scores.find(query, {"_id": 0})
        .sort([("score", -1), ("timestamp", 1)])
        .to_list(limit)
    )
    return [ScoreEntry(**r) for r in rows]


app.include_router(api_router)

# Stripe payments router (Coin pack purchases)
init_stripe()
payments_router = get_payments_router(db)
app.include_router(payments_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
