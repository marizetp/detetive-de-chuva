"""Tests for Upgrade v2.0: Strategic Crop Planning, Crop Profiles, and Municipalities.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app
from src.decision_engine import DecisionEngine
from src.schemas import AdvisoryStatus

client = TestClient(app)


def test_strategic_query_dry_season_july():
    """Verify that querying July 2027 returns DESFAVORAVEL to protect farmer resources."""
    payload = {
        "provincia": "Huambo",
        "cultura": "Milho",
        "data_consulta": "2027-07-15",
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "DESFAVORAVEL"
    assert data["score_confianca"] >= 80

    # July in Huambo has near zero rain
    metrics = data["metricas"]
    assert metrics["previsao_7dias_mm"] < 5.0
    assert metrics["chuva_acumulada_recente_mm"] < 5.0

    # Recommendation warns against rainfed planting to protect resources
    rec = data["recomendacao_extensao"]
    assert "NÃO PLANTAR" in rec or "DESFAVORÁVEL" in rec
    assert "Julho" in rec or "2027" in rec


def test_strategic_query_rainy_season_november():
    """Verify that querying November 2027 returns FAVORAVEL based on 25-year NASA baseline."""
    payload = {
        "provincia": "Huambo",
        "cultura": "Milho",
        "data_consulta": "2027-11-15",
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "FAVORAVEL"
    assert data["score_confianca"] >= 75

    # November in Huambo has substantial rainfall (~219 mm/month)
    metrics = data["metricas"]
    assert metrics["previsao_7dias_mm"] >= 25.0
    assert metrics["humidade_solo_raiz"] >= 0.40

    rec = data["recomendacao_extensao"]
    assert "FAVORÁVEL" in rec
    assert "Novembro" in rec or "2027" in rec


def test_crop_profile_feijao_waterlogging_risk():
    """Verify that Feijão triggers WATERLOGGING_RISK and AGUARDAR when soil is saturated."""
    engine = DecisionEngine()
    weather = {
        "chuva_acumulada_recente_mm": 55.0,
        "chuva_iminente_48h_mm": 20.0,
        "previsao_7dias_mm": 85.0,         # Heavy continuous rain
        "temperatura_max_7d_c": 24.0,
        "humidade_solo_raiz": 0.78,        # > 0.72 waterlogging limit for beans
        "humidade_solo_superficie": 0.82,
        "is_fallback": False,
    }
    result = engine.evaluate("Bié", "Feijão", "2026-11-12", weather)

    assert result.status == AdvisoryStatus.AGUARDAR
    assert "WATERLOGGING_RISK" in result.triggers_ativados


def test_crop_profile_soja_moisture_demand():
    """Verify that Soja requires high germination moisture (P50 >= 0.40)."""
    engine = DecisionEngine()
    weather = {
        "chuva_acumulada_recente_mm": 18.0,
        "chuva_iminente_48h_mm": 5.0,
        "previsao_7dias_mm": 22.0,
        "temperatura_max_7d_c": 26.0,
        "humidade_solo_raiz": 0.36,        # Below 0.40 floor for soy
        "humidade_solo_superficie": 0.38,
        "is_fallback": False,
    }
    result = engine.evaluate("Huambo", "Soja", "2026-11-12", weather)

    assert result.status == AdvisoryStatus.AGUARDAR
    assert "SOYBEAN_GERMINATION_MOISTURE_DEFICIT" in result.triggers_ativados


def test_municipality_override_caala():
    """Verify that passing optional municipio works seamlessly."""
    payload = {
        "provincia": "Huambo",
        "municipio": "Caála",
        "cultura": "Milho",
        "data_consulta": "2027-11-15",
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["FAVORAVEL", "AGUARDAR", "DESFAVORAVEL"]
    assert "metricas" in data
