"""Tests for Module 2: Real-Time Weather Integration.
"""

import sys
from pathlib import Path
import pytest

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.weather_service import WeatherService, get_weather_service


def test_weather_fallback():
    """Verify fallback generation against baseline climatology."""
    ws = WeatherService()
    fallback = ws._generate_fallback("Huambo", "2026-11-12", "Connection timeout")

    assert fallback["is_fallback"] is True
    assert "chuva_acumulada_recente_mm" in fallback
    assert "humidade_solo_raiz" in fallback
    assert "previsao_7dias_mm" in fallback
    assert fallback["humidade_solo_raiz"] > 0.0
    assert fallback["previsao_7dias_mm"] > 0.0


def test_weather_live_fetch():
    """Verify live fetch and parsing from Open-Meteo API."""
    ws = get_weather_service()
    weather = ws.fetch_weather("Huambo", "2026-11-12")

    assert "chuva_acumulada_recente_mm" in weather
    assert "humidade_solo_raiz" in weather
    assert "previsao_7dias_mm" in weather
    assert isinstance(weather["chuva_acumulada_recente_mm"], (int, float))
    assert isinstance(weather["humidade_solo_raiz"], (int, float))
    assert isinstance(weather["previsao_7dias_mm"], (int, float))


def test_weather_caching():
    """Verify in-memory caching for repeated queries."""
    ws = WeatherService()
    w1 = ws.fetch_weather("Bié", "2026-11-12")
    cache_key = ws._get_cache_key("Bié", "2026-11-12")
    assert cache_key in ws.cache

    # Second call should pull directly from cache
    w2 = ws.fetch_weather("Bié", "2026-11-12")
    assert w1 == w2
