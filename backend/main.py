"""Module 5: API Layer.

FastAPI application providing the Agricultural Decision Support System backend endpoints.
Disables Swagger / OpenAPI / ReDoc automatically when running in production (ENVIRONMENT=production).
"""

import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.schemas import (
    AdvisoryRequest,
    AdvisoryResponse,
    AdvisoryMetrics,
    DecisionEvaluationResult,
    ProvinceInfo,
    CropInfo,
)
from src.config import (
    PROVINCES,
    CROPS,
    PROCESSED_BASELINE_PATH,
    ENVIRONMENT,
    IS_PRODUCTION,
    IMERG_CONTRACT_FILES,
    COMPLIANCE_METADATA,
)
from src.baseline_engine import get_baseline_engine
from src.weather_service import get_weather_service
from src.decision_engine import get_decision_engine
from src.rag_service import get_rag_service
from src.ciclo_engine_adapter import get_ciclo_adapter, ZONE_DISPLAY_NAMES, normalize_zone


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: ensures baseline is loaded/generated on startup."""
    print(f"[*] Inicializando API (Ambiente: {ENVIRONMENT.upper()})...")
    if IS_PRODUCTION:
        print("[🔒] Ambiente de PRODUÇÃO detetado: Swagger UI e OpenAPI desativados por segurança.")
    else:
        print("[ℹ️] Ambiente de DESENVOLVIMENTO: Swagger UI disponível em /docs.")
    baseline_engine = get_baseline_engine()
    baseline = baseline_engine.load_baseline()
    prov_count = len(baseline.get("provincias", {}))
    print(f"[✓] Linha de base carregada ({prov_count} províncias do Planalto Central).")
    yield
    print("[*] Encerrando serviço.")


# Security: Disable Swagger, ReDoc, and OpenAPI spec in production
docs_url = None if IS_PRODUCTION else "/docs"
redoc_url = None if IS_PRODUCTION else "/redoc"
openapi_url = None if IS_PRODUCTION else "/openapi.json"

app = FastAPI(
    title="AgroKairos — Agricultural Decision Support API (NASA Space Apps)",
    description=(
        "AgroKairos Agroclimatic Decision Support Backend for Angola's Central Plateau (Huambo, Bié, Huíla). "
        "Combines 25 years of NASA GPM IMERG V07 & NASA POWER (MERRA-2) data, deterministic onset & "
        "false-start evaluation (ciclo_diario.py v0.3.0), 16-day Open-Meteo forecasts, 6-month ECMWF SEAS5 "
        "seasonal outlook, and optional LLM narrative synthesis (Google Gemini / OpenAI). "
        "Independent project — not an official NASA service."
    ),
    version="1.1.0",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route("/", methods=["GET", "HEAD"], tags=["Monitoring"])
def root_info() -> Dict[str, Any]:
    """Returns API status, main endpoints, NASA open data sources, and AI disclosure metadata."""
    return {
        "sistema": "AgroKairos — Agricultural Decision Support System (Planalto Central de Angola)",
        "title_en": COMPLIANCE_METADATA["project_name"],
        "versao": "1.1.0",
        "regiao": "Planalto Central (Huambo, Bié, Huíla)",
        "ambiente": ENVIRONMENT,
        "swagger_disponivel": not IS_PRODUCTION,
        "primary_documentation_language": COMPLIANCE_METADATA["primary_documentation_language"],
        "supported_api_languages": COMPLIANCE_METADATA["supported_api_languages"],
        "independent_project_notice": COMPLIANCE_METADATA["independent_project_notice"],
        "nasa_open_data": [d["dataset"] for d in COMPLIANCE_METADATA["nasa_open_data_and_resources"]],
        "ai_usage_disclosure": COMPLIANCE_METADATA["ai_usage_disclosure"],
        "endpoints_principais": {
            "advisory": "POST /api/v1/advisory",
            "optimal_planting": "GET /api/v1/optimal-planting?zona=huambo&cultura=Milho&epoca_agricola=2024/2025",
            "provinces": "GET /api/v1/provinces",
            "crops": "GET /api/v1/crops",
            "evaluate": "POST /api/v1/evaluate",
            "baseline": "GET /api/v1/baseline/{provincia}",
            "zonas_motor": "GET /zonas",
            "decisao_motor": "GET /zonas/{zona}/decisao",
            "curva_risco": "GET /zonas/{zona}/curva-risco/{data}",
            "falsa_partida": "GET /zonas/{zona}/falsa-partida/{data}",
            "indicadores": "GET /zonas/{zona}/indicadores/{data}",
            "previsao": "GET /zonas/{zona}/previsao/{data}",
            "fontes_saude": "GET /fontes/saude",
            "compliance": "GET /compliance",
            "health": "GET /health",
        },
    }


@app.get("/compliance", tags=["Monitoring"])
def compliance_info() -> Dict[str, Any]:
    """Returns NASA Space Apps judging compliance, NASA open-data attribution, and AI usage disclosure."""
    sources_health = get_ciclo_adapter().get_sources_health()
    return {
        **COMPLIANCE_METADATA,
        "motor_integrity": sources_health.get("motor"),
        "baseline_ready": PROCESSED_BASELINE_PATH.exists(),
        "imerg_zones_ready": {z: p.exists() for z, p in IMERG_CONTRACT_FILES.items()},
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Monitoring"])
def health_check() -> Dict[str, Any]:
    """Verifica a integridade do serviço, da linha de base NASA e das províncias."""
    baseline_exists = PROCESSED_BASELINE_PATH.exists()
    return {
        "status": "healthy",
        "baseline_ready": baseline_exists,
        "provincias_ativas": list(PROVINCES.keys()),
        "culturas_ativas": list(CROPS.keys()),
        "data_servidor": date.today().isoformat(),
    }


@app.get(
    "/api/v1/provinces",
    response_model=List[ProvinceInfo],
    tags=["Metadados"],
    summary="Listar Províncias",
)
def list_provinces() -> List[ProvinceInfo]:
    """Lista as províncias do Planalto Central, respetivas coordenadas e zonas agroecológicas."""
    result = []
    for p_name, p_data in PROVINCES.items():
        result.append(
            ProvinceInfo(
                id=p_data["id"],
                nome=p_data["name"],
                latitude=p_data["latitude"],
                longitude=p_data["longitude"],
                altitude_m=p_data["elevation_m"],
                zona_agroecologica=p_data["agroecological_zone"],
            )
        )
    return result


@app.get(
    "/api/v1/crops",
    response_model=List[CropInfo],
    tags=["Metadados"],
    summary="Listar Culturas Agrícolas",
)
def list_crops() -> List[CropInfo]:
    """Lista as culturas suportadas no sistema para preenchimento de seletores no frontend."""
    crops_list = []
    for c_key, c_val in CROPS.items():
        crops_list.append(
            CropInfo(
                id=c_val.get("id", c_key.lower()),
                nome=c_val["name"],
                nome_cientifico=c_val["scientific_name"],
                icone=c_val.get("icon", "🌱"),
                profundidade_sementeira_cm=c_val.get("sowing_depth_cm", c_val.get("soil_depth_cm", 5)),
                min_chuva_abertura_mm=c_val.get("min_rain_3d_mm", c_val.get("min_rain_onset_mm", 20.0)),
                notas_agronomicas=c_val.get("notes", ""),
            )
        )
    return crops_list


@app.get(
    "/api/v1/baseline/{provincia}",
    tags=["Agroclima"],
    summary="Consultar Linha de Base Histórica",
)
def get_province_baseline(provincia: str) -> Dict[str, Any]:
    """Consulta as matrizes históricas (2000-2024), percentis mensais e tendências de Mann-Kendall."""
    engine = get_baseline_engine()
    baseline = engine.load_baseline()

    # Search province
    for p_key, p_val in baseline.get("provincias", {}).items():
        if p_key.lower() == provincia.lower() or p_val.get("id") == provincia.lower():
            return p_val

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Província '{provincia}' não encontrada. Províncias suportadas: {list(PROVINCES.keys())}",
    )


@app.post(
    "/api/v1/evaluate",
    response_model=DecisionEvaluationResult,
    tags=["Decisão"],
    summary="Avaliação Agroclimática Determinística",
)
def evaluate_decision_only(payload: AdvisoryRequest) -> DecisionEvaluationResult:
    """Executa a avaliação agronómica determinística das regras heurísticas sem síntese LLM."""
    weather_svc = get_weather_service()
    decision_engine = get_decision_engine()

    try:
        weather_data = weather_svc.fetch_weather(
            payload.provincia, payload.data_consulta, payload.municipio
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    try:
        eval_result = decision_engine.evaluate(
            provincia=payload.provincia,
            cultura=payload.cultura,
            data_consulta=payload.data_consulta,
            weather_data=weather_data,
        )
        return eval_result
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post(
    "/api/v1/advisory",
    response_model=AdvisoryResponse,
    tags=["Recomendação"],
    summary="Obter Recomendação Agroclimática Completa (RAG)",
)
def get_agricultural_advisory(payload: AdvisoryRequest) -> AdvisoryResponse:
    """Endpoint Principal: Avalia o período de sementeira e devolve a recomendação formal via RAG."""
    weather_svc = get_weather_service()
    decision_engine = get_decision_engine()
    rag_svc = get_rag_service()

    # 1. Fetch weather with baseline fallback or strategic climatology
    try:
        weather_data = weather_svc.fetch_weather(
            payload.provincia, payload.data_consulta, payload.municipio
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Província inválida: {payload.provincia}. Províncias válidas: {list(PROVINCES.keys())}"
        )

    # 2. Rule-based evaluation against historical baseline
    try:
        eval_result = decision_engine.evaluate(
            provincia=payload.provincia,
            cultura=payload.cultura,
            data_consulta=payload.data_consulta,
            weather_data=weather_data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro durante avaliação agroclimática: {str(e)}"
        )

    # 3. Knowledge synthesis via RAG into formal, objective, and informative text (PT or EN)
    try:
        recomendacao_texto = rag_svc.generate_recommendation(
            provincia=payload.provincia,
            cultura=payload.cultura,
            data_consulta=payload.data_consulta,
            eval_result=eval_result,
            lang=payload.lang,
        )
    except Exception as e:
        print(f"[!] Erro no RAG: {e}. Utilizando gerador local formal.")
        recomendacao_texto = rag_svc._generate_local_agronomist_synthesis(
            payload.provincia, payload.cultura, payload.data_consulta, eval_result, lang=payload.lang
        )

    # 4. Assemble clean final response strictly matching specification
    response = AdvisoryResponse(
        status=eval_result.status,
        score_confianca=eval_result.score_confianca,
        metricas=AdvisoryMetrics(
            chuva_acumulada_recente_mm=eval_result.metricas.chuva_acumulada_recente_mm,
            humidade_solo_raiz=eval_result.metricas.humidade_solo_raiz,
            previsao_7dias_mm=eval_result.metricas.previsao_7dias_mm,
        ),
        recomendacao_extensao=recomendacao_texto,
    )

    return response


# =========================================================================== #
# Motor AgroKairos (ciclo_diario.py v0.3.0) - Endpoints Secção 7
# =========================================================================== #

@app.get("/zonas", tags=["Motor IMERG (Secção 7)"])
def list_motor_zones() -> Dict[str, Any]:
    """Lista as zonas disponíveis no motor IMERG e o estado da base histórica."""
    adapter = get_ciclo_adapter()
    zones = []
    for z_id, csv_path in IMERG_CONTRACT_FILES.items():
        zones.append({
            "id": z_id,
            "nome": ZONE_DISPLAY_NAMES.get(z_id, z_id.title()),
            "historico_imerg_pronto": csv_path.exists(),
            "ultimo_ciclo": adapter._last_runs.get(z_id),
        })
    return {
        "zonas": zones,
        "versao_motor": "0.3.0",
        "fonte_historica": "NASA GPM IMERG V07 (2000-2024)",
    }


@app.get("/zonas/{zona}/decisao", tags=["Motor IMERG (Secção 7)"])
def get_zone_decision_latest(zona: str) -> Dict[str, Any]:
    """Ciclo mais recente do motor para a zona: mensagem_agricultor, estado_motor, grau_confianca e resposta."""
    try:
        return get_ciclo_adapter().get_decisao_payload(zona, data_ref=None)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/zonas/{zona}/decisao/{data_ref}", tags=["Motor IMERG (Secção 7)"])
def get_zone_decision_by_date(zona: str, data_ref: str) -> Dict[str, Any]:
    """Decisão do motor ciclo_diario.py para uma zona e data específica (AAAA-MM-DD)."""
    try:
        return get_ciclo_adapter().get_decisao_payload(zona, data_ref=data_ref)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/zonas/{zona}/curva-risco", tags=["Motor IMERG (Secção 7)"])
@app.get("/zonas/{zona}/curva-risco/{data_ref}", tags=["Motor IMERG (Secção 7)"])
def get_zone_risk_curve(zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
    """Curva de risco de falso início com IC90 e primeira data abaixo da tolerância."""
    try:
        return get_ciclo_adapter().get_curva_risco_payload(zona, data_ref=data_ref)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/zonas/{zona}/falsa-partida", tags=["Motor IMERG (Secção 7)"])
@app.get("/zonas/{zona}/falsa-partida/{data_ref}", tags=["Motor IMERG (Secção 7)"])
def get_zone_false_start(zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
    """Estado da chuva candidata, falsa partida identificada e série informativa de dias secos."""
    try:
        return get_ciclo_adapter().get_falsa_partida_payload(zona, data_ref=data_ref)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/zonas/{zona}/indicadores", tags=["Motor IMERG (Secção 7)"])
@app.get("/zonas/{zona}/indicadores/{data_ref}", tags=["Motor IMERG (Secção 7)"])
def get_zone_indicators(zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
    """Indicadores complementares brutos (GWETROOT e T2M do NASA POWER; não entram na decisão do motor)."""
    try:
        return get_ciclo_adapter().get_indicadores_payload(zona, data_ref=data_ref)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/zonas/{zona}/previsao", tags=["Motor IMERG (Secção 7)"])
@app.get("/zonas/{zona}/previsao/{data_ref}", tags=["Motor IMERG (Secção 7)"])
def get_zone_forecast(zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
    """Previsão meteorológica de 16 dias separada da climatologia."""
    try:
        return get_ciclo_adapter().get_previsao_payload(zona, data_ref=data_ref)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@app.get("/fontes/saude", tags=["Motor IMERG (Secção 7)"])
def get_sources_health() -> Dict[str, Any]:
    """Integrity status of ciclo_diario.py (SHA-256), NASA/Open-Meteo data sources, and AI disclosure."""
    health_payload = get_ciclo_adapter().get_sources_health()
    return {
        **health_payload,
        "nasa_open_data": COMPLIANCE_METADATA["nasa_open_data_and_resources"],
        "ai_usage_disclosure": COMPLIANCE_METADATA["ai_usage_disclosure"],
        "independent_project_notice": COMPLIANCE_METADATA["independent_project_notice"],
    }


# =========================================================================== #
# Nova Funcionalidade: Recomendação da Melhor Época de Plantio (Safra)
# =========================================================================== #

@app.get("/api/v1/optimal-planting", tags=["Planeamento de Safra"])
@app.get("/zonas/{zona}/epoca-plantio", tags=["Planeamento de Safra"])
def get_optimal_planting_window(
    zona: Optional[str] = None,
    provincia: Optional[str] = Query(default=None, description="Província (Huambo, Bié ou Huíla)"),
    cultura: str = Query(default="Milho", description="Cultura (Milho, Feijão, Soja, Mandioca, Arroz)"),
    epoca_agricola: str = Query(default="2024/2025", description="Época agrícola / Safra (ex: 2024/2025)"),
) -> Dict[str, Any]:
    """Identifica automaticamente a melhor época de plantio para uma cultura e ano agrícola."""
    target_zone = zona or provincia or "huambo"
    try:
        return get_ciclo_adapter().compute_optimal_planting_window(
            zona=target_zone,
            cultura=cultura,
            epoca_agricola=epoca_agricola,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
