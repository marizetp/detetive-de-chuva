"""Tests for Module 5: API Layer and End-to-End Pipeline.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify service root returns information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "sistema" in data
    assert "endpoints_principais" in data


def test_health_endpoint():
    """Verify health endpoint shows baseline ready."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["baseline_ready"] is True


def test_list_provinces():
    """Verify province list contains Huambo, Bié, and Huíla."""
    response = client.get("/api/v1/provinces")
    assert response.status_code == 200
    provinces = response.json()
    names = [p["nome"] for p in provinces]
    assert "Huambo" in names
    assert "Bié" in names
    assert "Huíla" in names


def test_get_baseline_province():
    """Verify province baseline endpoint."""
    response = client.get("/api/v1/baseline/Huambo")
    assert response.status_code == 200
    data = response.json()
    assert data["nome"] == "Huambo"
    assert "linha_base_mensal" in data
    assert "curva_sementeira_semanal" in data


def test_post_advisory_primary_endpoint():
    """Verify primary POST /api/v1/advisory endpoint conforming strictly to task specification."""
    payload = {
        "provincia": "Huambo",
        "cultura": "Milho",
        "data_consulta": "2026-11-12",
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Core required fields in response payload
    assert "status" in data
    assert data["status"] in ["FAVORAVEL", "AGUARDAR", "DESFAVORAVEL"]

    assert "score_confianca" in data
    assert 0 <= data["score_confianca"] <= 100

    assert "metricas" in data
    metrics = data["metricas"]
    assert "chuva_acumulada_recente_mm" in metrics
    assert "humidade_solo_raiz" in metrics
    assert "previsao_7dias_mm" in metrics

    assert "recomendacao_extensao" in data
    rec = data["recomendacao_extensao"]
    assert len(rec) > 50

    # Verify absence of forbidden technical jargon
    forbidden_terms = ["Mann-Kendall", "SARIMA", "p-valor", "P25", "GWETROOT", "GWETTOP", "API"]
    for term in forbidden_terms:
        assert term.lower() not in rec.lower(), f"Forbidden jargon found in recommendation: {term}"


def test_post_advisory_bie_feijao():
    """Verify advisory for Bié with Feijão crop."""
    payload = {
        "provincia": "Bié",
        "cultura": "Feijão",
        "data_consulta": "2026-11-12",
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["FAVORAVEL", "AGUARDAR", "DESFAVORAVEL"]
    assert "metricas" in data


def test_post_advisory_only_provincia():
    """Verify advisory when farmer selects only the province."""
    payload = {
        "provincia": "Huambo"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "metricas" in data
    assert "recomendacao_extensao" in data
    # Verify formal tone (no 'irmão')
    assert "irmão" not in data["recomendacao_extensao"].lower()


def test_list_crops():
    """Verify crop list contains Milho, Feijão, and Soja with UI icons."""
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    crops = response.json()
    names = [c["nome"] for c in crops]
    assert "Milho" in names
    assert "Feijão" in names
    assert "Soja" in names
    # Verify icons and depth are present for frontend
    for crop in crops:
        assert "icone" in crop
        assert "profundidade_sementeira_cm" in crop
        assert "min_chuva_abertura_mm" in crop


def test_advisory_payload_cleanliness():
    """Verify backend returns clean payload without frontend UI logic."""
    payload = {"provincia": "Huambo", "cultura": "Milho"}
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "score_confianca" in data
    assert "metricas" in data
    assert "recomendacao_extensao" in data
    # Must not contain frontend UI hints in pure backend payload
    assert "ui_hints" not in data


def test_swagger_disabled_in_production(monkeypatch):
    """Verify Swagger UI and OpenAPI docs are disabled in production environment."""
    import os
    import importlib
    monkeypatch.setenv("ENVIRONMENT", "production")
    import src.config
    import main
    importlib.reload(src.config)
    importlib.reload(main)

    prod_client = TestClient(main.app)
    # Must return 404 in production
    assert prod_client.get("/docs").status_code == 404
    assert prod_client.get("/redoc").status_code == 404
    assert prod_client.get("/openapi.json").status_code == 404


def test_post_advisory_missing_provincia():
    """Verify 422 error when farmer fails to select province."""
    payload = {
        "data_consulta": "2026-11-12"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 422
