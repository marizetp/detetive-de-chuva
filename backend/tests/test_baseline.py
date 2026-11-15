"""Tests for Module 1: Ingestion & Statistical Baseline Generator.
"""

import sys
from pathlib import Path
import pytest
import pandas as pd

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.baseline_engine import BaselineEngine, get_baseline_engine
from src.config import PROVINCES, PROCESSED_BASELINE_PATH


def test_ingest_province_data_huambo():
    """Verify ingestion of NASA POWER raw data into DatetimeIndex DataFrame."""
    engine = BaselineEngine()
    df = engine.ingest_province_data(PROVINCES["Huambo"]["raw_file"])

    assert isinstance(df.index, pd.DatetimeIndex)
    assert len(df) == 9132  # 2000-01-01 to 2024-12-31
    assert "PRECTOTCORR" in df.columns
    assert "GWETROOT" in df.columns
    assert "GWETTOP" in df.columns
    assert "T2M" in df.columns
    assert "Chuva_Acumulada_3D" in df.columns
    # Check no missing data remains
    assert df.isna().sum().sum() == 0


def test_compute_monthly_baseline():
    """Verify monthly baseline statistics for all 12 calendar months."""
    engine = BaselineEngine()
    df = engine.ingest_province_data(PROVINCES["Huambo"]["raw_file"])
    monthly = engine.compute_monthly_baseline(df)

    assert len(monthly) == 12
    for m in range(1, 13):
        m_stat = monthly[m]
        assert "chuva_media_mensal_mm" in m_stat
        assert "probabilidade_dia_chuvoso_pct" in m_stat
        assert "gwetroot_p25" in m_stat
        assert "gwetroot_p50" in m_stat
        assert "gwetroot_p75" in m_stat
        # Percentiles must be non-decreasing
        assert m_stat["gwetroot_p25"] <= m_stat["gwetroot_p50"] <= m_stat["gwetroot_p75"]
        assert 0.0 <= m_stat["probabilidade_dia_chuvoso_pct"] <= 100.0

    # November in Huambo should have substantial rainfall (> 150 mm)
    assert monthly[11]["chuva_media_mensal_mm"] > 150.0
    # July (dry season) should have near zero rainfall
    assert monthly[7]["chuva_media_mensal_mm"] < 10.0


def test_compute_weekly_sowing_curve():
    """Verify weekly sowing curves (weeks 1 to 52)."""
    engine = BaselineEngine()
    df = engine.ingest_province_data(PROVINCES["Huambo"]["raw_file"])
    weekly = engine.compute_weekly_sowing_curve(df)

    assert len(weekly) == 52
    for w in range(1, 53):
        w_stat = weekly[w]
        assert "probabilidade_sementeira_pct" in w_stat
        assert "gwetroot_mediana" in w_stat
        assert 0.0 <= w_stat["probabilidade_sementeira_pct"] <= 100.0


def test_mann_kendall_trends():
    """Verify Mann-Kendall trend analysis on 25-year aggregated series."""
    engine = BaselineEngine()
    df = engine.ingest_province_data(PROVINCES["Huambo"]["raw_file"])
    trends = engine.compute_trend_analysis(df)

    assert "precipitacao_anual" in trends
    assert "temperatura_media_anual" in trends
    assert "humidade_raiz_anual" in trends

    for metric in ["precipitacao_anual", "temperatura_media_anual", "humidade_raiz_anual"]:
        t = trends[metric]
        assert "tendencia" in t
        assert "p_valor" in t
        assert "inclinacao_sen" in t
        assert 0.0 <= t["p_valor"] <= 1.0


def test_load_baseline_file():
    """Verify loading from precomputed processed_baseline.json."""
    engine = get_baseline_engine()
    baseline = engine.load_baseline()

    assert "provincias" in baseline
    assert "Huambo" in baseline["provincias"]
    assert "Bié" in baseline["provincias"]
    assert "Huíla" in baseline["provincias"]
