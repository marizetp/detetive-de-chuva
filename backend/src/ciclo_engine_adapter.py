"""Adapter & Orchestrator for ciclo_diario.py (AgroKairos Scientific Motor v0.3.0).

Implements Sections 4, 5, 6, 7, 8, and 11 of the AgroKairos (formerly Detetive da Chuva) backend specification:
- Preserves ciclo_diario.py untouched on disk (exact SHA-256 verification).
- Resolves zone aliases (huambo, bie/cuito, huila/lubango).
- Prepares verified IMERG V07 historical CSVs and seasonal/live observed slices
  strictly honoring the Rule of Gold (never labels non-IMERG data as IMERG).
- Executes ciclo_diario with per-(zone, date) thread locking, stores immutable
  byte-identical JSON outputs with SHA-256 operational envelopes.
- Maps official 6 decision codes strictly to PLANTAR (indicativo), AGUARDAR, or SEM CONCLUSÃO.
- Computes Optimal Planting Window ("Melhor Época de Plantio") for a given agricultural season
  and crop combining 25-year IMERG V07 + NASA POWER baselines + Crop Profiles.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
import threading
import time
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

try:
    from src.config import (
        BASE_DIR,
        CICLO_ACCEPTED_VERSIONS,
        CICLO_MOTOR_PATH,
        CICLO_MOTOR_SHA256,
        CROP_PROFILES,
        DATA_DIR,
        IMERG_CONTRACT_FILES,
        PROVINCES,
        SAIDAS_DIR,
    )
    from src.baseline_engine import get_baseline_engine
    from src.weather_service import get_weather_service
except ImportError:
    from config import (
        BASE_DIR,
        CICLO_ACCEPTED_VERSIONS,
        CICLO_MOTOR_PATH,
        CICLO_MOTOR_SHA256,
        CROP_PROFILES,
        DATA_DIR,
        IMERG_CONTRACT_FILES,
        PROVINCES,
        SAIDAS_DIR,
    )
    from baseline_engine import get_baseline_engine
    from weather_service import get_weather_service


# Official Section 4 code-to-farmer response mapping
MOTOR_CODE_TO_RESPONSE: Dict[str, str] = {
    "FAVORAVEL_INDICATIVO": "PLANTAR (indicativo)",
    "AGUARDAR_RISCO_ELEVADO": "AGUARDAR",
    "AGUARDAR_CANDIDATA_EM_FORMACAO": "AGUARDAR",
    "AGUARDAR_SEM_CHUVA_CANDIDATA": "AGUARDAR",
    "SEM_BASE_FIAVEL": "SEM CONCLUSÃO",
    "FORA_DA_EPOCA": "SEM CONCLUSÃO (fora da época)",
}

MOTOR_CODE_TO_RESPONSE_EN: Dict[str, str] = {
    "FAVORAVEL_INDICATIVO": "PLANT (indicative)",
    "AGUARDAR_RISCO_ELEVADO": "WAIT (elevated risk)",
    "AGUARDAR_CANDIDATA_EM_FORMACAO": "WAIT (onset forming)",
    "AGUARDAR_SEM_CHUVA_CANDIDATA": "WAIT (no onset rain yet)",
    "SEM_BASE_FIAVEL": "NO CONCLUSION",
    "FORA_DA_EPOCA": "NO CONCLUSION (off-season)",
}

MOTOR_CODE_NOTES_EN: Dict[str, str] = {
    "FAVORAVEL_INDICATIVO": "Indicative favorable rain onset detected within historical tolerance bounds; verify soil readiness locally.",
    "AGUARDAR_RISCO_ELEVADO": "False-start risk remains above safety tolerance based on historical IMERG V07 distribution.",
    "AGUARDAR_CANDIDATA_EM_FORMACAO": "Candidate onset rainfall detected and under confirmation window.",
    "AGUARDAR_SEM_CHUVA_CANDIDATA": "No qualifying onset rain event observed up to the reference date.",
    "SEM_BASE_FIAVEL": "Insufficient observed IMERG data up to the reference date to issue an operational decision.",
    "FORA_DA_EPOCA": "Reference date falls outside the September-February rainy onset monitoring season.",
}

ZONE_ALIASES: Dict[str, str] = {
    "huambo": "huambo",
    "bie": "bie",
    "cuito": "bie",
    "kuito": "bie",
    "huila": "huila",
    "lubango": "huila",
}

ZONE_DISPLAY_NAMES: Dict[str, str] = {
    "huambo": "Huambo",
    "bie": "Bié (Cuíto)",
    "huila": "Huíla (Lubango)",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_zone(zona: str) -> str:
    if not zona or not str(zona).strip():
        raise ValueError("Zona não informada.")
    norm = unicodedata.normalize("NFKD", str(zona)).encode("ASCII", "ignore").decode("utf-8").strip().lower()
    if norm in ZONE_ALIASES:
        return ZONE_ALIASES[norm]
    raise ValueError(f"Zona '{zona}' não suportada. Zonas válidas: {list(IMERG_CONTRACT_FILES.keys())}")


def map_codigo_to_resposta(codigo: Optional[str], lang: str = "pt") -> str:
    """Strictly maps motor code to farmer answer; never invents PLANTAR."""
    is_en = str(lang or "pt").strip().lower().startswith("en")
    if not codigo:
        return "NO CONCLUSION" if is_en else "SEM CONCLUSÃO"
    table = MOTOR_CODE_TO_RESPONSE_EN if is_en else MOTOR_CODE_TO_RESPONSE
    return table.get(codigo, "NO CONCLUSION" if is_en else "SEM CONCLUSÃO")


class CicloEngineAdapter:
    """Thread-safe orchestrator for ciclo_diario.py v0.3.0."""

    def __init__(self) -> None:
        self._motor_module = None
        self._locks: Dict[str, threading.Lock] = {}
        self._global_lock = threading.Lock()
        self._source_health: Dict[str, Dict[str, Any]] = {
            "imerg_historico": {"estado": "ok", "ultima_verificacao": None},
            "imerg_observado": {"estado": "nao_pedida", "ultima_verificacao": None},
            "open_meteo": {"estado": "nao_pedida", "ultima_verificacao": None},
            "sazonal": {"estado": "nao_pedida", "ultima_verificacao": None},
        }
        self._last_runs: Dict[str, Dict[str, Any]] = {}

    def _get_lock(self, key: str) -> threading.Lock:
        with self._global_lock:
            if key not in self._locks:
                self._locks[key] = threading.Lock()
            return self._locks[key]

    def _load_motor(self):
        """Dynamically imports ciclo_diario.py after verifying its SHA-256 and version."""
        if self._motor_module is not None:
            return self._motor_module

        if not CICLO_MOTOR_PATH.exists():
            raise FileNotFoundError(f"Motor ciclo_diario.py não encontrado em {CICLO_MOTOR_PATH}")

        actual_sha = sha256_file(CICLO_MOTOR_PATH)
        if actual_sha != CICLO_MOTOR_SHA256:
            raise RuntimeError(
                f"SHA-256 do motor ciclo_diario.py ({actual_sha}) difere do esperado ({CICLO_MOTOR_SHA256})."
            )

        spec = importlib.util.spec_from_file_location("ciclo_diario_motor", str(CICLO_MOTOR_PATH))
        module = importlib.util.module_from_spec(spec)
        sys.modules["ciclo_diario_motor"] = module
        spec.loader.exec_module(module)

        if getattr(module, "VERSAO_CODIGO", None) not in CICLO_ACCEPTED_VERSIONS:
            raise RuntimeError(f"Versão desconhecida do motor: {getattr(module, 'VERSAO_CODIGO', None)}")

        # Configure runtime Open-Meteo constants cleanly in memory (leaving file on disk untouched)
        module.VARS_SOLO_PREVISAO = (
            "soil_moisture_0_to_7cm",
            "soil_moisture_7_to_28cm",
            "soil_moisture_28_to_100cm",
        )
        module.DIAS_PREVISAO_DET = 16

        self._motor_module = module
        return self._motor_module

    def _resolve_observed_csv(
        self, zona_id: str, data_ref_str: str, hist_csv: Path
    ) -> Tuple[Optional[Path], Optional[str], bool]:
        """Resolves IMERG observed CSV if genuinely available for the season.

        Returns (obs_path, fonte_observado, obs_provisorio).
        Never pretends non-IMERG data is IMERG.
        """
        data_ref_dt = date.fromisoformat(data_ref_str)
        season_start_year = data_ref_dt.year if data_ref_dt.month >= 9 else data_ref_dt.year - 1
        season_start = date(season_start_year, 9, 1)

        # 1. Check explicit IMERG Late file placed in data/ (e.g. obs_imerg_huambo.csv)
        explicit_obs = DATA_DIR / f"obs_imerg_{zona_id}.csv"
        if explicit_obs.exists():
            df_obs = pd.read_csv(explicit_obs)
            if not df_obs.empty and "data" in df_obs.columns:
                max_dt = str(df_obs["data"].max())
                min_dt = str(df_obs["data"].min())
                if min_dt <= data_ref_str and max_dt >= season_start.isoformat():
                    self._source_health["imerg_observado"] = {
                        "estado": "ok",
                        "origem": explicit_obs.name,
                        "ultima_verificacao": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    }
                    return explicit_obs, "imerg", True

        # 2. Check if data_ref falls inside our verified 2000-2024 IMERG V07 archive (historical replay)
        if hist_csv.exists():
            df_hist = pd.read_csv(hist_csv)
            yesterday_str = (data_ref_dt - timedelta(days=1)).isoformat()
            slice_df = df_hist[
                (df_hist["data"] >= season_start.isoformat())
                & (df_hist["data"] <= yesterday_str)
            ]
            # Only use archive slice if the season actually exists in the IMERG archive
            if not slice_df.empty and len(slice_df) >= 1 and season_start_year <= 2024:
                inputs_dir = SAIDAS_DIR / zona_id / "inputs"
                inputs_dir.mkdir(parents=True, exist_ok=True)
                obs_slice_path = inputs_dir / f"obs_imerg_archive_{data_ref_str}.csv"
                slice_df.to_csv(obs_slice_path, index=False, na_rep="")
                self._source_health["imerg_observado"] = {
                    "estado": "ok",
                    "origem": f"IMERG V07 arquivo ({season_start_year}/{str(season_start_year+1)[-2:]})",
                    "ultima_verificacao": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
                return obs_slice_path, "imerg", False

        self._source_health["imerg_observado"] = {
            "estado": "nao_disponivel",
            "motivo": f"Sem série observada IMERG Late para época {season_start_year}/{str(season_start_year+1)[-2:]}",
            "ultima_verificacao": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        return None, None, False

    def _build_dry_day_presentation(
        self, obs_csv: Optional[Path], saida: Dict[str, Any], data_ref_str: str
    ) -> Optional[Dict[str, Any]]:
        """Section 5 read-only helper: computes consecutive dry days until yesterday from observed CSV."""
        if not obs_csv or not obs_csv.exists():
            return None

        regra = saida.get("regra_v0", {})
        limiar = float(regra.get("limiar_dia_seco_mm", 1.0))
        seca_alvo = int(regra.get("seca_consecutiva_dias", 10))

        df = pd.read_csv(obs_csv)
        if df.empty or "data" not in df.columns or "chuva_mm" not in df.columns:
            return None

        df = df[df["data"] < data_ref_str].sort_values("data")
        if df.empty:
            return None

        # Count consecutive dry days backwards from latest observed day
        dry_streak = 0
        for val in reversed(df["chuva_mm"].tolist()):
            if pd.isna(val):
                break
            if float(val) < limiar:
                dry_streak += 1
            else:
                break

        recent_tail = df.tail(30)[["data", "chuva_mm"]].copy()
        serie = [
            {"data": str(r["data"]), "chuva_mm": None if pd.isna(r["chuva_mm"]) else float(r["chuva_mm"])}
            for _, r in recent_tail.iterrows()
        ]

        return {
            "rotulo": "apresentação, não decisão",
            "limiar_dia_seco_mm": limiar,
            "seca_consecutiva_referencia_dias": seca_alvo,
            "dias_secos_consecutivos_ate_ontem": dry_streak,
            "ultimos_30_dias_observados": serie,
        }

    def run_cycle(
        self,
        zona: str,
        data_ref: Optional[str] = None,
        with_forecast: bool = False,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Executes or retrieves cached cycle for (zona, data_ref) with full SHA-256 envelope."""
        zona_id = normalize_zone(zona)
        data_ref_str = data_ref or date.today().isoformat()
        # Validate ISO date format
        date.fromisoformat(data_ref_str)

        hist_csv = IMERG_CONTRACT_FILES.get(zona_id)
        if not hist_csv or not hist_csv.exists():
            raise FileNotFoundError(
                f"CSV histórico IMERG não encontrado para '{zona_id}'. Execute extract_imerg.py primeiro."
            )

        self._source_health["imerg_historico"] = {
            "estado": "ok",
            "ficheiro": hist_csv.name,
            "sha256": sha256_file(hist_csv),
            "ultima_verificacao": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }

        lock = self._get_lock(f"{zona_id}_{data_ref_str}")
        with lock:
            dt_obj = date.fromisoformat(data_ref_str)
            ep_ano = dt_obj.year if dt_obj.month >= 9 else dt_obj.year - 1
            ep_label = f"{ep_ano}-{str(ep_ano + 1)[-2:]}"
            out_dir = SAIDAS_DIR / zona_id / ep_label
            out_json_path = out_dir / f"ciclo_{data_ref_str}.json"
            env_json_path = out_dir / f"envelope_{data_ref_str}.json"

            # Return persisted immutable JSON if already generated and not forcing forecast refresh
            if out_json_path.exists() and env_json_path.exists() and not force_refresh and not with_forecast:
                raw_bytes = out_json_path.read_bytes()
                saida = json.loads(raw_bytes.decode("utf-8"))
                envelope = json.loads(env_json_path.read_text(encoding="utf-8"))
                return {"saida": saida, "envelope": envelope, "obs_csv": None}

            motor = self._load_motor()
            obs_csv, fonte_obs, obs_prov = self._resolve_observed_csv(zona_id, data_ref_str, hist_csv)

            args = argparse.Namespace(
                zona=zona_id,
                lat=None,
                lon=None,
                historico=str(hist_csv),
                observado=str(obs_csv) if obs_csv else None,
                obs_provisorio=obs_prov,
                data_ref=data_ref_str,
                saida=str(SAIDAS_DIR),
                horizonte=25,
                janela_risco=21,
                exportar_inicios=None,
                dias_ensemble=0,
                modelo_ensemble="ecmwf_ifs025",
                validacao=None,
                tolerancias=[0.10, 0.20, 0.30],
                ic="wilson",
                grelha_sensibilidade=False,
                hash_especificacao=None,
                sem_rede=not with_forecast,
                fonte_historico="imerg",
                fonte_observado=fonte_obs,
                exigir_pericia=False,
                condicionar_fronteira=False,
                mensagem_agricultor=True,
                tolerancia_decisao=0.20,
                previsao=with_forecast,
                sazonal=False,
                ensemble_vars=None,
                ensemble_ficheiro=None,
                chirps_gefs_tif=None,
                escrever_latest=False,
                validar_pericia=None,
            )

            t0 = time.perf_counter()
            stderr_msg = None
            try:
                saida = motor.correr_ciclo(args)
                estado_exec = "ok"
            except Exception as e:
                estado_exec = "falhou"
                stderr_msg = str(e)
                raise RuntimeError(f"Falha ao executar motor ciclo_diario: {e}") from e
            finally:
                duracao_ms = round((time.perf_counter() - t0) * 1000, 1)

            # Validate output contract (Section 6)
            if not isinstance(saida, dict):
                raise RuntimeError("Saída do motor não é um JSON válido.")
            if saida.get("versao_codigo") not in CICLO_ACCEPTED_VERSIONS:
                raise RuntimeError(f"Versão não aceite na saída: {saida.get('versao_codigo')}")
            if "estado_motor" not in saida or "codigo" not in (saida.get("mensagem_agricultor") or {}):
                raise RuntimeError("Saída do motor incompleta: faltam estado_motor ou mensagem_agricultor.codigo.")

            # Persist immutable byte-identical output
            motor.escrever_json(out_json_path, saida)
            saida_sha = sha256_file(out_json_path)

            if with_forecast:
                prev_blk = saida.get("previsao_meteorologica") or {}
                det_state = (prev_blk.get("fontes") or {}).get("previsao_deterministica", {}).get("estado", "falhou")
                self._source_health["open_meteo"] = {
                    "estado": det_state,
                    "ultima_verificacao": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }

            codigo = saida["mensagem_agricultor"]["codigo"]
            envelope = {
                "zona": zona_id,
                "zona_nome": ZONE_DISPLAY_NAMES.get(zona_id, zona_id.title()),
                "data_ref": data_ref_str,
                "estado_execucao": estado_exec,
                "versao_motor": saida.get("versao_codigo"),
                "motor_sha256": CICLO_MOTOR_SHA256,
                "sha256_saida": saida_sha,
                "duracao_ms": duracao_ms,
                "stderr": stderr_msg,
                "resposta_agricultor": map_codigo_to_resposta(codigo),
                "obs_csv_usado": str(obs_csv) if obs_csv else None,
            }
            env_json_path.write_text(json.dumps(envelope, ensure_ascii=False, indent=2), encoding="utf-8")
            self._last_runs[zona_id] = {
                "data_ref": data_ref_str,
                "estado_execucao": estado_exec,
                "codigo_decisao": codigo,
                "resposta": envelope["resposta_agricultor"],
                "gerado_em": saida.get("gerado_em"),
            }

            return {"saida": saida, "envelope": envelope, "obs_csv": obs_csv}

    def get_decisao_payload(self, zona: str, data_ref: Optional[str] = None, lang: str = "pt") -> Dict[str, Any]:
        """Section 7: GET /zonas/{zona}/decisao[/data]."""
        is_en = str(lang or "pt").strip().lower().startswith("en")
        norm_lang = "en" if is_en else "pt"
        res = self.run_cycle(zona, data_ref=data_ref)
        saida = res["saida"]
        env = res["envelope"]
        msg = dict(saida.get("mensagem_agricultor") or {})
        codigo = msg.get("codigo")
        if is_en and codigo in MOTOR_CODE_NOTES_EN:
            msg["texto_original_pt"] = msg.get("texto")
            msg["texto"] = MOTOR_CODE_NOTES_EN[codigo]
        return {
            "zona": env["zona"],
            "zona_nome": env["zona_nome"],
            "epoca": saida.get("epoca"),
            "data_ref": saida.get("data_ref"),
            "gerado_em": saida.get("gerado_em"),
            "resposta": map_codigo_to_resposta(codigo, lang=norm_lang),
            "mensagem_agricultor": msg,
            "estado_motor": saida.get("estado_motor"),
            "grau_confianca": saida.get("grau_confianca"),
            "fontes_declaradas": saida.get("fontes_declaradas"),
            "limiares_provisorios": saida.get("limiares_provisorios", True),
            "versao_codigo": saida.get("versao_codigo"),
            "n_epocas": (saida.get("climatologia") or {}).get("n_epocas"),
            "content_language": norm_lang,
            "envelope_operacional": {
                "sha256_saida": env["sha256_saida"],
                "motor_sha256": env["motor_sha256"],
                "duracao_ms": env["duracao_ms"],
            },
        }

    def get_curva_risco_payload(self, zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
        """Section 7: GET /zonas/{zona}/curva-risco[/data]."""
        res = self.run_cycle(zona, data_ref=data_ref)
        saida = res["saida"]
        env = res["envelope"]
        return {
            "zona": env["zona"],
            "data_ref": saida.get("data_ref"),
            "epoca": saida.get("epoca"),
            "n_epocas": (saida.get("climatologia") or {}).get("n_epocas"),
            "curva_risco_falso_inicio": saida.get("curva_risco_falso_inicio"),
            "primeira_data_abaixo_da_tolerancia": saida.get("primeira_data_abaixo_da_tolerancia"),
            "primeira_data_abaixo_da_tolerancia_fiavel": saida.get("primeira_data_abaixo_da_tolerancia_fiavel"),
            "tolerancias_atingiveis": saida.get("tolerancias_atingiveis"),
            "calendario_fixo": saida.get("calendario_fixo"),
            "climatologia_quantis_km": (saida.get("climatologia") or {}).get("inicio_quantis_km"),
            "limiares_provisorios": saida.get("limiares_provisorios", True),
            "sha256_saida": env["sha256_saida"],
        }

    def get_falsa_partida_payload(self, zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
        """Section 7: GET /zonas/{zona}/falsa-partida[/data]."""
        res = self.run_cycle(zona, data_ref=data_ref)
        saida = res["saida"]
        env = res["envelope"]
        obs_path = Path(env["obs_csv_usado"]) if env.get("obs_csv_usado") else None
        apresentacao = self._build_dry_day_presentation(obs_path, saida, saida.get("data_ref"))
        return {
            "zona": env["zona"],
            "data_ref": saida.get("data_ref"),
            "epoca": saida.get("epoca"),
            "estado_motor": saida.get("estado_motor"),
            "data_chuva_candidata_ou_inicio": saida.get("data_chuva_candidata_ou_inicio"),
            "candidata_detalhe": saida.get("candidata_detalhe"),
            "primeira_chuva_candidata_falhada": saida.get("primeira_chuva_candidata_falhada"),
            "apresentacao_nao_decisao": apresentacao,
            "limiares_provisorios": saida.get("limiares_provisorios", True),
            "sha256_saida": env["sha256_saida"],
        }

    def get_indicadores_payload(self, zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
        """Section 7: GET /zonas/{zona}/indicadores[/data]."""
        res = self.run_cycle(zona, data_ref=data_ref)
        saida = res["saida"]
        env = res["envelope"]
        return {
            "zona": env["zona"],
            "data_ref": saida.get("data_ref"),
            "rotulo": "não entram na decisão",
            "decisao_integrada": saida.get("decisao_integrada", False),
            "indicadores_complementares": saida.get("indicadores_complementares"),
            "descritivos": saida.get("descritivos"),
            "sha256_saida": env["sha256_saida"],
        }

    def get_previsao_payload(self, zona: str, data_ref: Optional[str] = None) -> Dict[str, Any]:
        """Section 7: GET /zonas/{zona}/previsao[/data]."""
        res = self.run_cycle(zona, data_ref=data_ref, with_forecast=True)
        saida = res["saida"]
        env = res["envelope"]
        return {
            "zona": env["zona"],
            "data_ref": saida.get("data_ref"),
            "rotulo": "previsão meteorológica, não é climatologia",
            "previsao_meteorologica": saida.get("previsao_meteorologica"),
            "sha256_saida": env["sha256_saida"],
        }

    def get_sources_health(self) -> Dict[str, Any]:
        """Section 7: GET /fontes/saude."""
        return {
            "motor": {
                "versao": "0.3.0",
                "sha256": CICLO_MOTOR_SHA256,
                "integro": CICLO_MOTOR_PATH.exists() and sha256_file(CICLO_MOTOR_PATH) == CICLO_MOTOR_SHA256,
            },
            "fontes": self._source_health,
            "ultimas_execucoes_por_zona": self._last_runs,
        }

    def compute_optimal_planting_window(
        self,
        zona: str,
        cultura: str = "Milho",
        epoca_agricola: str = "2024/2025",
        lang: str = "pt",
        municipio: Optional[str] = None,
        data_consulta: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Computes the recommended optimal planting window for a crop and agricultural season.

        Combines:
        1. 25-year NASA GPM IMERG V07 Kaplan-Meier onset quantiles & false-start risk curve
        2. 25-year NASA POWER soil moisture & temperature baseline
        3. Crop-specific biological requirements (Milho, Feijão, Soja, Mandioca, Arroz)
        4. Optional 6-month seasonal outlook (Open-Meteo ECMWF SEAS5) for upcoming seasons
        5. Optional synchronized deterministic evaluation (`avaliacao_atual`) for municipality + reference date
        """
        is_en = str(lang or "pt").strip().lower().startswith("en")
        norm_lang = "en" if is_en else "pt"
        zona_id = normalize_zone(zona)
        prov_name = {"huambo": "Huambo", "bie": "Bié", "huila": "Huíla"}[zona_id]

        # Resolve agricultural season start year (e.g., "2024/2025" -> 2024)
        try:
            start_year = int(str(epoca_agricola).split("/")[0].strip())
        except Exception:
            start_year = date.today().year if date.today().month >= 9 else date.today().year - 1

        # Reference mid-season date to extract the full 24/25-year climatology via ciclo_diario
        ref_date = f"{start_year}-11-15"
        res = self.run_cycle(zona_id, data_ref=ref_date)
        saida = res["saida"]
        clim = saida.get("climatologia", {})
        cal = saida.get("calendario_fixo", {}).get("datas", {})
        quantis = clim.get("inicio_quantis_km", {})

        # Crop profile adjustments
        crop_key = next((k for k in CROP_PROFILES.keys() if k.lower() == cultura.lower()), "Milho")
        crop_cfg = CROP_PROFILES[crop_key]

        baseline_eng = get_baseline_engine()
        weekly_curve = baseline_eng.load_baseline().get("provincias", {}).get(prov_name, {}).get("curva_sementeira_semanal", {})
        monthly_matrix = baseline_eng.load_baseline().get("provincias", {}).get(prov_name, {}).get("linha_base_mensal", {})

        # Base IMERG median onset (P50) & P90 consolidation
        p50_str = quantis.get("P50") or f"{start_year}-10-05"
        p90_str = quantis.get("P90") or f"{start_year}-10-22"
        p50_dt = date.fromisoformat(p50_str)
        p90_dt = date.fromisoformat(p90_str)

        # Crop-specific agronomic offset from historical rainfall onset
        if crop_key == "Arroz":
            rec_start = p90_dt + timedelta(days=7)
            rec_end = date(start_year, 12, 15)
            cal_key = "1 Nov"
        elif crop_key == "Soja":
            rec_start = p90_dt
            rec_end = date(start_year, 12, 10)
            cal_key = "15 Out"
        elif crop_key == "Feijão":
            rec_start = p50_dt + timedelta(days=10)
            rec_end = date(start_year, 11, 25)
            cal_key = "15 Out"
        elif crop_key == "Mandioca":
            rec_start = p50_dt
            rec_end = date(start_year, 11, 30)
            cal_key = "1 Out"
        else:  # Milho
            rec_start = p50_dt + timedelta(days=12)
            rec_end = date(start_year, 12, 5)
            cal_key = "15 Out"

        # False start risk from IMERG calendario_fixo (uses conservative IC90 bound, never 0% or 100% certainty)
        cal_stats = (cal.get(cal_key) or {}).get("serie_completa", {})
        false_start_p = float(cal_stats.get("p", 0.05))
        false_start_ic90 = cal_stats.get("ic90", [0.0, 0.15])
        ic90_upper = float(false_start_ic90[1]) if len(false_start_ic90) == 2 else min(false_start_p + 0.10, 0.95)
        favorability_prob_pct = round(min(max((1.0 - ic90_upper) * 100.0, 5.0), 95.0), 1)

        # Check monthly moisture & rain suitability across the recommended months
        oct_stats = monthly_matrix.get("10") or monthly_matrix.get(10) or {}
        nov_stats = monthly_matrix.get("11") or monthly_matrix.get(11) or {}
        dec_stats = monthly_matrix.get("12") or monthly_matrix.get(12) or {}

        # Seasonal 6-month outlook (for current/upcoming year)
        seasonal_outlook = None
        current_year = date.today().year
        if start_year >= current_year - 1:
            seasonal_outlook = get_weather_service().fetch_seasonal_outlook(prov_name)

        # Weekly probability curve during the main agricultural window (Sept - Feb: ISO weeks 36-52, 1-9)
        def _week_month_and_metrics(w_iso: int) -> Tuple[int, float, float]:
            approx_m = date.fromisocalendar(2025, w_iso, 4).month
            w_row = weekly_curve.get(str(w_iso)) or weekly_curve.get(w_iso) or {}
            m_row = monthly_matrix.get(str(approx_m)) or monthly_matrix.get(approx_m) or {}
            moist_val = w_row.get("humidade_raiz_mediana")
            if moist_val is None:
                moist_val = w_row.get("gwetroot_mediana")
            if moist_val is None:
                moist_val = m_row.get("gwetroot_p50", 0.30)
            rain_val = w_row.get("chuva_semanal_media_mm")
            if rain_val is None:
                rain_val = float(m_row.get("chuva_media_mensal_mm", 0.0)) / 4.33
            return approx_m, float(moist_val), float(rain_val)

        season_weeks = list(range(36, 53)) + list(range(1, 10))
        weekly_series = []
        for w in season_weeks:
            w_data = weekly_curve.get(str(w)) or weekly_curve.get(w)
            if w_data:
                _, w_moist_val, w_rain_val = _week_month_and_metrics(w)
                weekly_series.append({
                    "semana_iso": w,
                    "probabilidade_favoravel_pct": w_data.get("probabilidade_sementeira_pct", 0.0),
                    "humidade_raiz_mediana": round(w_moist_val, 3),
                    "chuva_semanal_media_mm": round(w_rain_val, 1),
                })

        # Full 52-week crop-adjusted annual cycle (powers the cycle wheel & monthly calendar)
        min_monthly_rain = float(crop_cfg.get("min_monthly_rain_mm", 110.0))
        min_root = float(crop_cfg.get("min_absolute_root_moisture", 0.35))
        waterlog_limit = float(crop_cfg.get("waterlogging_limit", 0.85))
        rec_start_week = rec_start.isocalendar()[1]
        rec_end_week = rec_end.isocalendar()[1]

        def _is_in_rec_window(w: int) -> bool:
            if rec_start_week <= rec_end_week:
                return rec_start_week <= w <= rec_end_week
            return w >= rec_start_week or w <= rec_end_week

        ciclo_anual_52s = []
        for w in range(1, 53):
            w_data = weekly_curve.get(str(w)) or weekly_curve.get(w) or {}
            base_prob = float(w_data.get("probabilidade_sementeira_pct", 5.0))
            approx_month, w_moist, w_rain = _week_month_and_metrics(w)

            # Crop-specific moisture & rainfall modulation (deterministic, aligned with decision_engine thresholds)
            rain_ratio = min((w_rain * 4.33) / max(min_monthly_rain, 1.0), 1.35)
            moist_factor = 1.0 if w_moist >= min_root else max(0.35, w_moist / max(min_root, 0.01))
            waterlog_penalty = 0.72 if w_moist > waterlog_limit else 1.0

            is_kakimbo = approx_month in (5, 6, 7, 8)
            in_opt = _is_in_rec_window(w)

            raw_score = base_prob * (0.55 + 0.45 * min(rain_ratio, 1.15)) * moist_factor * waterlog_penalty
            if is_kakimbo:
                raw_score = min(raw_score, 18.0)

            prob_clamped = round(min(max(raw_score, 5.0), 95.0), 1)
            if is_kakimbo or prob_clamped < 35.0:
                nivel = "baixa"
                fase = "CACIMBO_SECO" if is_kakimbo else "FORA_JANELA"
            elif w_moist > waterlog_limit or prob_clamped < 65.0:
                nivel = "media"
                fase = "ENCHARCAMENTO_CAUTELA" if w_moist > waterlog_limit else "TRANSICAO_CAUTELA"
            else:
                nivel = "alta"
                fase = "PLANTIO_OTIMO" if in_opt else "CHUVAS_CONSOLIDADAS"

            ciclo_anual_52s.append({
                "semana_iso": w,
                "probabilidade_cultura_pct": prob_clamped,
                "nivel": nivel,
                "fase_ciclo": fase,
                "dentro_janela_otima": in_opt,
                "humidade_raiz_mediana": round(w_moist, 3),
                "chuva_semanal_media_mm": round(w_rain, 1),
            })

        ciclo_mensal_12m = []
        for m in range(1, 13):
            m_data = monthly_matrix.get(str(m)) or monthly_matrix.get(m) or {}
            m_rain = float(m_data.get("chuva_media_mensal_mm", 0.0))
            m_moist = float(m_data.get("gwetroot_p50", 0.30))
            m_temp = float(m_data.get("temperatura_media_c", 20.0))
            is_kakimbo = m in (5, 6, 7, 8)

            rain_fit = min(m_rain / max(min_monthly_rain, 1.0), 1.25)
            moist_fit = 1.0 if m_moist >= min_root else max(0.3, m_moist / max(min_root, 0.01))
            waterlog_penalty = 0.72 if m_moist > waterlog_limit else 1.0
            m_score = 88.0 * min(rain_fit, 1.0) * moist_fit * waterlog_penalty
            if is_kakimbo:
                m_score = min(m_score, 15.0)
            m_prob = round(min(max(m_score, 5.0), 95.0), 1)
            nivel = "baixa" if (is_kakimbo or m_prob < 35.0) else ("alta" if m_prob >= 65.0 else "media")
            ciclo_mensal_12m.append({
                "mes": m,
                "probabilidade_cultura_pct": m_prob,
                "nivel": nivel,
                "chuva_media_mensal_mm": round(m_rain, 1),
                "humidade_solo_raiz_p50": round(m_moist, 3),
                "temperatura_media_c": round(m_temp, 1),
            })

        n_epocas = clim.get("n_epocas", 24)
        desc_sep = "to" if is_en else "a"
        freq_hist = cal_stats.get("frequencia")
        if is_en:
            freq_hist_out = f"observed across {n_epocas} historical seasons"
            nota_falsa = "risk estimated from past seasons (NASA GPM IMERG V07); not a certainty (Wilson IC90)"
            notas_agro = crop_cfg.get("notes_en", crop_cfg["notes"])
            aviso_out = "Indicative outlook based on 25-season probabilistic analysis; always verify field soil conditions locally."
            cultura_display = crop_cfg.get("name_en", crop_key)
        else:
            freq_hist_out = freq_hist or f"em {n_epocas} épocas"
            nota_falsa = "risco estimado a partir de épocas passadas (IMERG V07); não é certeza"
            notas_agro = crop_cfg["notes"]
            aviso_out = "Indicativo baseado em análise probabilística histórica de 25 épocas; sem validação agronómica local de campo."
            cultura_display = crop_key

        # Synchronized current/date-specific deterministic evaluation (matches /api/v1/map-overview & /evaluate)
        avaliacao_atual = None
        if data_consulta or municipio:
            try:
                try:
                    from src.decision_engine import get_decision_engine
                except ImportError:
                    from decision_engine import get_decision_engine

                query_date = data_consulta or date.today().isoformat()
                w_data = get_weather_service().fetch_weather(prov_name, query_date, municipio)
                ev = get_decision_engine().evaluate(
                    provincia=prov_name,
                    cultura=crop_key,
                    data_consulta=query_date,
                    weather_data=w_data,
                    lang=norm_lang,
                )
                avaliacao_atual = {
                    "provincia": prov_name,
                    "municipio": municipio or None,
                    "data_consulta": query_date,
                    "status": ev.status.value,
                    "score_confianca": ev.score_confianca,
                    "metricas": ev.metricas.model_dump(),
                    "justificacoes_tecnicas": ev.justificacoes_tecnicas,
                    "is_fallback_weather": ev.is_fallback_weather,
                    "prob_sementeira_semanal": ev.detalhes_agroclimaticos.get("prob_sementeira_semanal"),
                }
            except Exception:
                avaliacao_atual = None

        return {
            "zona": zona_id,
            "provincia": prov_name,
            "municipio": municipio or None,
            "cultura": crop_key,
            "cultura_exibicao": cultura_display,
            "icone_cultura": crop_cfg.get("icon", "🌱"),
            "epoca_agricola": f"{start_year}/{start_year + 1}",
            "content_language": norm_lang,
            "avaliacao_atual": avaliacao_atual,
            "janela_recomendada": {
                "inicio": rec_start.isoformat(),
                "fim": rec_end.isoformat(),
                "descricao_periodo": f"{rec_start.strftime('%d/%m/%Y')} {desc_sep} {rec_end.strftime('%d/%m/%Y')}",
                "inicio_chuvas_mediano_imerg": p50_str,
                "consolidacao_chuvas_p90_imerg": p90_str,
            },
            "probabilidade_condicoes_favoraveis_pct": favorability_prob_pct,
            "risco_falsa_partida": {
                "data_referencia": cal_key,
                "probabilidade_pct": round(float(false_start_p) * 100.0, 1),
                "ic90_pct": [round(float(x) * 100.0, 1) for x in false_start_ic90],
                "frequencia_historica": freq_hist_out,
                "nota": nota_falsa,
            },
            "condicoes_historicas_epoca": {
                "outubro_chuva_mm": oct_stats.get("chuva_media_mensal_mm"),
                "novembro_chuva_mm": nov_stats.get("chuva_media_mensal_mm"),
                "dezembro_chuva_mm": dec_stats.get("chuva_media_mensal_mm"),
                "humidade_solo_raiz_nov_p50": nov_stats.get("gwetroot_p50"),
                "temperatura_media_nov_c": nov_stats.get("temperatura_media_c"),
            },
            "exigencia_cultura": {
                "chuva_abertura_3d_mm": crop_cfg["min_rain_3d_mm"],
                "chuva_mensal_min_mm": crop_cfg["min_monthly_rain_mm"],
                "humidade_raiz_min": crop_cfg["min_absolute_root_moisture"],
                "limite_encharcamento": crop_cfg["waterlogging_limit"],
                "profundidade_cm": crop_cfg["sowing_depth_cm"],
                "notas_agronomicas": notas_agro,
            },
            "curva_semanal_safra": weekly_series,
            "ciclo_anual_52s": ciclo_anual_52s,
            "ciclo_mensal_12m": ciclo_mensal_12m,
            "previsao_sazonal_6m": seasonal_outlook,
            "fontes": {
                "precipitacao": "NASA GPM IMERG V07 (2000-2024)",
                "solo_e_temperatura": "NASA POWER / MERRA-2 (2000-2024)",
                "motor_estatistico": f"ciclo_diario.py v{saida.get('versao_codigo')}",
            },
            "aviso": aviso_out,
        }


_adapter_instance: Optional[CicloEngineAdapter] = None


def get_ciclo_adapter() -> CicloEngineAdapter:
    global _adapter_instance
    if _adapter_instance is None:
        _adapter_instance = CicloEngineAdapter()
    return _adapter_instance
