"""Tests for full backend i18n (en/pt), annual crop cycle, and map overview endpoints."""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app

client = TestClient(app)


def test_evaluate_lang_en_preserves_numbers_and_status():
    pt_res = client.post("/api/v1/evaluate", json={
        "provincia": "Huambo",
        "cultura": "Milho",
        "data_consulta": "2026-11-15",
        "lang": "pt-AO",
    })
    en_res = client.post("/api/v1/evaluate", json={
        "provincia": "Huambo",
        "cultura": "Milho",
        "data_consulta": "2026-11-15",
        "lang": "en-US",
    })
    assert pt_res.status_code == 200
    assert en_res.status_code == 200

    pt_data = pt_res.json()
    en_data = en_res.json()

    assert pt_data["content_language"] == "pt"
    assert en_data["content_language"] == "en"
    assert pt_data["status"] == en_data["status"]
    assert pt_data["score_confianca"] == en_data["score_confianca"]
    assert pt_data["metricas"] == en_data["metricas"]
    assert pt_data["triggers_ativados"] == en_data["triggers_ativados"]
    assert pt_data["justificacoes_tecnicas"] != en_data["justificacoes_tecnicas"]


def test_invalid_lang_returns_422():
    res_post = client.post("/api/v1/evaluate", json={
        "provincia": "Huambo",
        "cultura": "Milho",
        "lang": "fr",
    })
    assert res_post.status_code == 422

    res_get = client.get("/api/v1/optimal-planting?provincia=Huambo&cultura=Milho&lang=fr")
    assert res_get.status_code == 422


def test_optimal_planting_annual_cycle_and_en():
    res = client.get("/api/v1/optimal-planting?provincia=Huambo&cultura=Feijão&epoca_agricola=2025/2026&lang=en")
    assert res.status_code == 200
    data = res.json()
    assert data["content_language"] == "en"
    assert " to " in data["janela_recomendada"]["descricao_periodo"]
    assert len(data["ciclo_anual_52s"]) == 52
    assert len(data["ciclo_mensal_12m"]) == 12
    for w in data["ciclo_anual_52s"]:
        assert 5.0 <= w["probabilidade_cultura_pct"] <= 95.0
        assert w["nivel"] in ("alta", "media", "baixa")


def test_municipalities_and_map_overview():
    munis_res = client.get("/api/v1/municipalities?provincia=Huambo")
    assert munis_res.status_code == 200
    munis = munis_res.json()
    names = {m["nome"] for m in munis}
    assert {"Huambo", "Caála", "Bailundo", "Catchiungo"}.issubset(names)

    map_res = client.get("/api/v1/map-overview?cultura=Soja&data_consulta=2026-11-15&provincia=Bié&lang=en")
    assert map_res.status_code == 200
    payload = map_res.json()
    assert payload["content_language"] == "en"
    assert set(payload["provincias"].keys()) == {"Huambo", "Bié", "Huíla"}
    assert "Kuito" in payload["municipios"]
    assert "Camacupa" in payload["municipios"]


def test_optimal_planting_matches_map_overview_for_municipality():
    m_res = client.get("/api/v1/map-overview?cultura=Milho&data_consulta=2026-11-15&provincia=Huambo&lang=en")
    c_res = client.get(
        "/api/v1/optimal-planting?provincia=Huambo&municipio=Ca%C3%A1la&data_consulta=2026-11-15&cultura=Milho&epoca_agricola=2026/2027&lang=en"
    )
    assert m_res.status_code == 200
    assert c_res.status_code == 200
    m_caala = m_res.json()["municipios"]["Caála"]
    cycle = c_res.json()
    assert cycle["avaliacao_atual"] is not None
    assert cycle["avaliacao_atual"]["status"] == m_caala["status"]
    assert cycle["avaliacao_atual"]["score_confianca"] == m_caala["score_confianca"]
    assert cycle["avaliacao_atual"]["metricas"] == m_caala["metricas"]
    w46 = next(w for w in cycle["ciclo_anual_52s"] if w["semana_iso"] == 46)
    assert w46["chuva_semanal_media_mm"] > 20.0
    assert w46["humidade_raiz_mediana"] > 0.40
