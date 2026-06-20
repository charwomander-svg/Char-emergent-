import os
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from ultimate_card_collection import CONTENT_PIPELINE, get_blueprint, router


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app)


def test_blueprint_has_launch_and_platform_sections():
    blueprint = get_blueprint()

    assert blueprint["product_name"] == "The Ultimate Card Collection"
    assert len(blueprint["launch_tiers"]["launch"]) >= 9
    assert blueprint["xbox_targets"]["platforms"] == ["Xbox Series X", "Xbox Series S"]
    assert "Controller-only navigation on every screen" in blueprint["xbox_targets"]["accessibility_baseline"]


def test_content_pipeline_tags_cover_discoverability():
    tags = CONTENT_PIPELINE["metadata_tags"]
    assert "category" in tags
    assert "player_count" in tags
    assert "supports_online" in tags


def test_blueprint_endpoint_exposes_vertical_slices():
    client = build_client()

    response = client.get("/api/card-collection/blueprint")
    assert response.status_code == 200

    data = response.json()
    assert data["product_name"] == "The Ultimate Card Collection"
    assert [item["id"] for item in data["vertical_slices"]] == [
        "klondike",
        "blackjack",
        "texas-holdem",
    ]


def test_catalog_endpoint_exposes_tag_dimensions():
    client = build_client()

    response = client.get("/api/card-collection/catalog")
    assert response.status_code == 200

    data = response.json()
    assert "launch_tiers" in data
    assert "complexity" in data["tag_dimensions"]
