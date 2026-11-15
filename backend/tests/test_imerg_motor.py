"""Tests for IMERG V07 extraction, ciclo_diario.py v0.3.0 integration, Section 7 REST API,
Section 11 acceptance criteria, and Optimal Planting Window endpoint.
"""

import sys
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app
from src.config import IMERG_CONTRACT_FILES, CICLO_MOTOR_SHA256
from src.ciclo_engine_adapter import map_codigo_to_resposta, normalize_zone

client = TestClient(app)


def test_imerg_contract_csvs_valid():
    """Acceptance criteria: contract CSVs have ISO dates, chuva_mm, and zero -999/-9999 values."""
    for zone_id, csv_path in IMERG_CONTRACT_FILES.items():
        assert csv_path.exists(), f"Missing contract CSV for {zone_id}: {csv_path}"
        df = pd.read_csv(csv_path)
        assert len(df) == 4525
        assert "data" in df.columns
        assert "chuva_mm" in df.columns
        assert "gwetroot" in df.columns
        assert "t2m" in df.columns
        assert (df["chuva_mm"] < 0).sum() == 0, f"Negative rain values in {csv_path}"
        # Verify ISO format YYYY-MM-DD
        assert df["data"].str.match(r"^\d{4}-\d{2}-\d{2}$").all()


def test_section_4_code_mapping_acceptance():
    """Section 11 acceptance test: table of all 6 motor codes."""
    assert map_codigo_to_resposta("FAVORAVEL_INDICATIVO") == "PLANTAR (indicativo)"
    assert map_codigo_to_resposta("AGUARDAR_RISCO_ELEVADO") == "AGUARDAR"
    assert map_codigo_to_resposta("AGUARDAR_CANDIDATA_EM_FORMACAO") == "AGUARDAR"
    assert map_codigo_to_resposta("AGUARDAR_SEM_CHUVA_CANDIDATA") == "AGUARDAR"
    assert map_codigo_to_resposta("SEM_BASE_FIAVEL") == "SEM CONCLUSÃO"
    assert map_codigo_to_resposta("FORA_DA_EPOCA") == "SEM CONCLUSÃO (fora da época)"
    assert map_codigo_to_resposta("UNKNOWN_CODE") == "SEM CONCLUSÃO"


def test_zone_normalization():
    """Verify zone normalization aliases."""
    assert normalize_zone("Huambo") == "huambo"
    assert normalize_zone("Bié") == "bie"
    assert normalize_zone("Cuíto") == "bie"
    assert normalize_zone("Lubango") == "huila"
    assert normalize_zone("Huíla") == "huila"


def test_sources_health_motor_sha256():
    """Section 7 & 11: verify motor SHA-256 matches frozen v0.3.0 specification."""
    resp = client.get("/fontes/saude")
    assert resp.status_code == 200
    data = resp.json()
    assert data["motor"]["versao"] == "0.3.0"
    assert data["motor"]["sha256"] == CICLO_MOTOR_SHA256
    assert data["motor"]["integro"] is True


def test_list_zonas_endpoint():
    """Section 7: GET /zonas."""
    resp = client.get("/zonas")
    assert resp.status_code == 200
    data = resp.json()
    zone_ids = [z["id"] for z in data["zonas"]]
    assert "huambo" in zone_ids
    assert "bie" in zone_ids
    assert "huila" in zone_ids
    assert all(z["historico_imerg_pronto"] is True for z in data["zonas"])


def test_decision_historical_imerg_replay_idempotent():
    """Section 7 & 11: run decision for 2024-11-15 (IMERG archive) twice -> byte-identical sha256."""
    resp1 = client.get("/zonas/huambo/decisao/2024-11-15")
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert d1["mensagem_agricultor"]["codigo"] == "FAVORAVEL_INDICATIVO"
    assert d1["resposta"] == "PLANTAR (indicativo)"
    assert d1["estado_motor"] == "inicio_confirmado"
    assert d1["limiares_provisorios"] is True
    assert d1["n_epocas"] == 24

    resp2 = client.get("/zonas/huambo/decisao/2024-11-15")
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d1["envelope_operacional"]["sha256_saida"] == d2["envelope_operacional"]["sha256_saida"]


def test_decision_fora_da_epoca():
    """Section 4 & 8: any date between March 1 and August 31 returns FORA_DA_EPOCA."""
    resp = client.get("/zonas/huambo/decisao/2024-06-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["mensagem_agricultor"]["codigo"] == "FORA_DA_EPOCA"
    assert data["resposta"] == "SEM CONCLUSÃO (fora da época)"
    assert data["estado_motor"] == "fora_da_epoca"


def test_decision_without_live_imerg_returns_sem_conclusao():
    """Section 8: without current-season IMERG observed CSV, engine strictly returns SEM_BASE_FIAVEL."""
    resp = client.get("/zonas/huambo/decisao/2026-11-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["mensagem_agricultor"]["codigo"] == "SEM_BASE_FIAVEL"
    assert data["resposta"] == "SEM CONCLUSÃO"


def test_curva_risco_endpoint():
    """Section 7: GET /zonas/{zona}/curva-risco/{data}."""
    resp = client.get("/zonas/huambo/curva-risco/2024-11-15")
    assert resp.status_code == 200
    data = resp.json()
    assert "curva_risco_falso_inicio" in data
    assert len(data["curva_risco_falso_inicio"]["pontos"]) > 0
    assert "calendario_fixo" in data
    assert "climatologia_quantis_km" in data


def test_falsa_partida_endpoint():
    """Section 7: GET /zonas/{zona}/falsa-partida/{data}."""
    resp = client.get("/zonas/huambo/falsa-partida/2024-11-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["estado_motor"] == "inicio_confirmado"
    assert data["data_chuva_candidata_ou_inicio"] == "2024-10-17"


def test_indicadores_endpoint():
    """Section 7: GET /zonas/{zona}/indicadores/{data} strictly labeled as non-decisional."""
    resp = client.get("/zonas/huambo/indicadores/2024-11-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["rotulo"] == "não entram na decisão"
    assert data["decisao_integrada"] is False
    assert "indicadores_complementares" in data


def test_optimal_planting_all_crops():
    """Verify Optimal Planting Window endpoint for multiple crops and provinces."""
    for crop in ["Milho", "Feijão", "Soja", "Mandioca", "Arroz"]:
        resp = client.get(
            "/api/v1/optimal-planting",
            params={"zona": "bie", "cultura": crop, "epoca_agricola": "2024/2025"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["cultura"] == crop
        assert data["provincia"] == "Bié"
        assert "janela_recomendada" in data
        assert 0 < data["probabilidade_condicoes_favoraveis_pct"] < 100.0
        assert len(data["curva_semanal_safra"]) > 10


def test_compliance_endpoint_and_ai_disclosure():
    """Verify NASA Space Apps compliance endpoint, NASA open-data attribution, and AI usage disclosure."""
    resp = client.get("/compliance")
    assert resp.status_code == 200
    data = resp.json()
    assert data["primary_documentation_language"] == "en"
    assert "not an official nasa service" in data["independent_project_notice"].lower()
    datasets = [d["dataset"] for d in data["nasa_open_data_and_resources"]]
    assert any("IMERG" in d for d in datasets)
    assert any("NASA POWER" in d for d in datasets)
    assert data["ai_usage_disclosure"]["ai_used"] is True
    assert "Code and data" in data["ai_usage_disclosure"]["code_and_data_acknowledgement"]
    assert data["motor_integrity"]["integro"] is True


def test_advisory_english_language_option():
    """Verify POST /api/v1/advisory supports lang='en' without forbidden jargon."""
    resp = client.post(
        "/api/v1/advisory",
        json={
            "provincia": "Huambo",
            "cultura": "Milho",
            "data_consulta": "2027-11-15",
            "lang": "en",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAVORAVEL"
    rec = data["recomendacao_extensao"]
    assert "FAVORABLE" in rec
    import re
    for term in ["Mann-Kendall", "SARIMA", "p-value", "P25", "GWETROOT", "GWETTOP"]:
        assert term.lower() not in rec.lower()
    assert re.search(r"\bAPIs?\b", rec, re.IGNORECASE) is None

