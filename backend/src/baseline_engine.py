"""Module 1: Ingestion & Statistical Baseline Generator.

Ingests daily historical NASA POWER JSON files (2000-2024) for Huambo, Bié, and Huíla,
cleans missing data, computes monthly agroclimatic matrices, weekly sowing curves,
and performs Mann-Kendall trend tests.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import pymannkendall as pmk

try:
    from src.config import PROVINCES, PROCESSED_BASELINE_PATH, RAW_DATA_DIR
except ImportError:
    from config import PROVINCES, PROCESSED_BASELINE_PATH, RAW_DATA_DIR


class BaselineEngine:
    """Processes NASA POWER data and calculates statistical agroclimatic baselines."""

    def __init__(self, data_dir: Optional[Path] = None, output_file: Optional[Path] = None):
        self.data_dir = Path(data_dir) if data_dir else RAW_DATA_DIR
        self.output_file = Path(output_file) if output_file else PROCESSED_BASELINE_PATH
        self._cached_baseline: Optional[Dict[str, Any]] = None

    def ingest_province_data(self, raw_filename: str) -> pd.DataFrame:
        """Loads and cleans raw NASA POWER JSON data for a province into a DataFrame."""
        file_path = self.data_dir / raw_filename
        if not file_path.exists():
            raise FileNotFoundError(f"NASA POWER raw data file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            raw_payload = json.load(f)

        params = raw_payload.get("properties", {}).get("parameter", {})
        if not params:
            raise ValueError(f"Malformed NASA POWER payload in {raw_filename}: missing 'properties.parameter'")

        df = pd.DataFrame(params)
        df.index = pd.to_datetime(df.index, format="%Y%m%d")
        df.index.name = "date"

        # Replace NASA POWER missing value indicators (-999.0 or None) with NaN
        df = df.replace([-999.0, -999, None], np.nan)

        # Forward-fill followed by backward-fill as specified
        df = df.ffill().bfill()

        # Add derived date fields
        df["year"] = df.index.year
        df["month"] = df.index.month
        df["week"] = df.index.isocalendar().week.astype(int)

        # Calculate Rolling 3-day rainfall sum
        df["Chuva_Acumulada_3D"] = df["PRECTOTCORR"].rolling(window=3, min_periods=1).sum()

        return df

    def compute_monthly_baseline(self, df: pd.DataFrame) -> Dict[int, Dict[str, float]]:
        """Computes agroclimatic baseline matrix for months 1 through 12."""
        monthly_stats: Dict[int, Dict[str, float]] = {}

        # Monthly total rainfall per year (to calculate true average monthly rainfall)
        monthly_annual_rain = df.groupby(["year", "month"])["PRECTOTCORR"].sum().reset_index()

        for month in range(1, 13):
            m_df = df[df["month"] == month]
            m_rain_series = monthly_annual_rain[monthly_annual_rain["month"] == month]["PRECTOTCORR"]

            avg_monthly_rain = float(m_rain_series.mean()) if not m_rain_series.empty else 0.0
            prob_rain_day = float((m_df["PRECTOTCORR"] >= 5.0).mean() * 100.0)

            # Root-zone soil moisture percentiles (P25 drought threshold, P50 median, P75)
            p25_root = float(m_df["GWETROOT"].quantile(0.25))
            p50_root = float(m_df["GWETROOT"].quantile(0.50))
            p75_root = float(m_df["GWETROOT"].quantile(0.75))

            # Surface soil moisture and temperatures
            avg_surface_moisture = float(m_df["GWETTOP"].mean())
            mean_t2m = float(m_df["T2M"].mean())
            mean_t2m_max = float(m_df["T2M_MAX"].mean())
            mean_t2m_min = float(m_df["T2M_MIN"].mean())

            monthly_stats[month] = {
                "month": month,
                "chuva_media_mensal_mm": round(avg_monthly_rain, 1),
                "probabilidade_dia_chuvoso_pct": round(prob_rain_day, 1),
                "gwetroot_p25": round(p25_root, 3),
                "gwetroot_p50": round(p50_root, 3),
                "gwetroot_p75": round(p75_root, 3),
                "gwettop_media": round(avg_surface_moisture, 3),
                "temperatura_media_c": round(mean_t2m, 1),
                "temperatura_max_c": round(mean_t2m_max, 1),
                "temperatura_min_c": round(mean_t2m_min, 1),
            }

        return monthly_stats

    def compute_weekly_sowing_curve(self, df: pd.DataFrame) -> Dict[int, Dict[str, float]]:
        """Computes weekly sowing condition probability and moisture for weeks 1 through 52."""
        weekly_stats: Dict[int, Dict[str, float]] = {}
        total_years = len(df["year"].unique())

        for week in range(1, 53):
            w_df = df[df["week"] == week]
            if w_df.empty:
                continue

            # Sowing Condition Probability: Percentage of historical years where Chuva_Acumulada_3D >= 20.0 mm
            max_3d_per_year = w_df.groupby("year")["Chuva_Acumulada_3D"].max()
            favorable_years = (max_3d_per_year >= 20.0).sum()
            prob_sowing_year = float((favorable_years / total_years) * 100.0)

            # Typical root moisture (GWETROOT median)
            root_median = float(w_df["GWETROOT"].median())
            surface_mean = float(w_df["GWETTOP"].mean())

            weekly_stats[week] = {
                "week": week,
                "probabilidade_sementeira_pct": round(prob_sowing_year, 1),
                "gwetroot_mediana": round(root_median, 3),
                "gwettop_media": round(surface_mean, 3),
            }

        return weekly_stats

    def compute_trend_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Performs Mann-Kendall test on annual aggregated rainfall, temperature, and root-zone moisture."""
        # Resample annually using year-end aggregation
        annual = df.resample("YE").agg({
            "PRECTOTCORR": "sum",
            "T2M": "mean",
            "GWETROOT": "mean",
        })

        # Remove any partial years if incomplete
        if len(annual) < 10:
            annual = df.groupby("year").agg({
                "PRECTOTCORR": "sum",
                "T2M": "mean",
                "GWETROOT": "mean",
            })

        mk_rain = pmk.original_test(annual["PRECTOTCORR"])
        mk_temp = pmk.original_test(annual["T2M"])
        mk_root = pmk.original_test(annual["GWETROOT"])

        def format_mk(res) -> Dict[str, Any]:
            return {
                "tendencia": str(res.trend),
                "p_valor": round(float(res.p), 5),
                "inclinacao_sen": round(float(res.slope), 4),
                "estatistica_z": round(float(res.z), 3),
                "significativo_alfa_005": bool(res.h),
            }

        return {
            "periodo_anos": f"{annual.index.year.min()}-{annual.index.year.max()}",
            "precipitacao_anual": format_mk(mk_rain),
            "temperatura_media_anual": format_mk(mk_temp),
            "humidade_raiz_anual": format_mk(mk_root),
        }

    def process_all_provinces(self, save_to_file: bool = True) -> Dict[str, Any]:
        """Ingests and calculates the complete baseline matrix for all supported provinces."""
        consolidated: Dict[str, Any] = {
            "metadata": {
                "descricao": "Matrizes de Linha de Base Agroclimática (2000-2024)",
                "fonte": "NASA POWER AG Community API",
                "regiao": "Planalto Central de Angola (Huambo, Bié, Huíla)",
                "anos_historicos": 25,
            },
            "provincias": {},
        }

        for prov_name, prov_info in PROVINCES.items():
            print(f"[*] Processando linha de base para {prov_name}...")
            df = self.ingest_province_data(prov_info["raw_file"])

            monthly = self.compute_monthly_baseline(df)
            weekly = self.compute_weekly_sowing_curve(df)
            trends = self.compute_trend_analysis(df)

            consolidated["provincias"][prov_name] = {
                "id": prov_info["id"],
                "nome": prov_name,
                "coordenadas": {
                    "latitude": prov_info["latitude"],
                    "longitude": prov_info["longitude"],
                    "altitude_m": prov_info["elevation_m"],
                },
                "zona_agroecologica": prov_info["agroecological_zone"],
                "linha_base_mensal": monthly,
                "curva_sementeira_semanal": weekly,
                "analise_tendencias_mann_kendall": trends,
            }

        if save_to_file:
            self.output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.output_file, "w", encoding="utf-8") as f:
                json.dump(consolidated, f, indent=2, ensure_ascii=False)
            print(f"[✓] Linha de base processada com sucesso salva em: {self.output_file}")

        self._cached_baseline = consolidated
        return consolidated

    def load_baseline(self) -> Dict[str, Any]:
        """Loads the precomputed baseline from file, generating it if necessary."""
        if self._cached_baseline:
            return self._cached_baseline

        if not self.output_file.exists():
            print(f"[*] Arquivo de linha de base não encontrado em {self.output_file}. Gerando agora...")
            return self.process_all_provinces(save_to_file=True)

        with open(self.output_file, "r", encoding="utf-8") as f:
            self._cached_baseline = json.load(f)

        return self._cached_baseline

    def get_province_month_stats(self, provincia: str, month: int) -> Dict[str, Any]:
        """Retrieves monthly baseline statistics for a province."""
        baseline = self.load_baseline()
        prov_data = baseline.get("provincias", {}).get(provincia)
        if not prov_data:
            # Try case-insensitive lookup
            for p_key, p_val in baseline.get("provincias", {}).items():
                if p_key.lower() == provincia.lower():
                    prov_data = p_val
                    break

        if not prov_data:
            raise KeyError(f"Província '{provincia}' não encontrada na linha de base.")

        monthly = prov_data.get("linha_base_mensal", {})
        # JSON keys might be strings
        stats = monthly.get(month) or monthly.get(str(month))
        if not stats:
            raise KeyError(f"Mês {month} não encontrado na linha de base da província '{provincia}'.")

        return stats

    def get_province_week_stats(self, provincia: str, week: int) -> Dict[str, Any]:
        """Retrieves weekly sowing curve statistics for a province."""
        baseline = self.load_baseline()
        prov_data = baseline.get("provincias", {}).get(provincia)
        if not prov_data:
            for p_key, p_val in baseline.get("provincias", {}).items():
                if p_key.lower() == provincia.lower():
                    prov_data = p_val
                    break

        if not prov_data:
            raise KeyError(f"Província '{provincia}' não encontrada na linha de base.")

        weekly = prov_data.get("curva_sementeira_semanal", {})
        stats = weekly.get(week) or weekly.get(str(week))
        if not stats:
            # Fallback to nearest week if week 53 or edge case
            week_clamped = min(max(week, 1), 52)
            stats = weekly.get(week_clamped) or weekly.get(str(week_clamped))

        return stats or {}


_engine_instance: Optional[BaselineEngine] = None


def get_baseline_engine() -> BaselineEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = BaselineEngine()
    return _engine_instance


if __name__ == "__main__":
    engine = BaselineEngine()
    engine.process_all_provinces(save_to_file=True)
