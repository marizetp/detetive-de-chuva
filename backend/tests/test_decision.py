"""Tests for Module 3: Rule-Based Decision Engine.
"""

import sys
from pathlib import Path
import pytest

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.decision_engine import DecisionEngine
from src.schemas import AdvisoryStatus


@pytest.fixture
def engine():
    return DecisionEngine()


def test_decision_favorable(engine):
    """Verify favorable assessment when root moisture is high and rainfall is confirmed."""
    weather = {
        "chuva_acumulada_recente_mm": 35.0,
        "chuva_iminente_48h_mm": 10.0,
        "previsao_7dias_mm": 45.0,
        "temperatura_max_7d_c": 25.0,
        "humidade_solo_raiz": 0.52,  # Well above P25 (0.43)
        "humidade_solo_superficie": 0.55,
        "is_fallback": False,
    }
    result = engine.evaluate("Huambo", "Milho", "2026-11-12", weather)

    assert result.status == AdvisoryStatus.FAVORAVEL
    assert result.score_confianca >= 75
    assert "RECENT_RAIN_TRIGGER_SATISFIED" in result.triggers_ativados
    assert "CRITICAL_ROOT_MOISTURE_DEFICIT" not in result.triggers_ativados


def test_decision_critical_root_moisture_rejection(engine):
    """Verify rejection when current root-zone moisture < P25 and no rain coming."""
    weather = {
        "chuva_acumulada_recente_mm": 5.0,
        "chuva_iminente_48h_mm": 0.0,
        "previsao_7dias_mm": 4.0,
        "temperatura_max_7d_c": 28.0,
        "humidade_solo_raiz": 0.25,  # Far below P25 (0.43)
        "humidade_solo_superficie": 0.22,
        "is_fallback": False,
    }
    result = engine.evaluate("Huambo", "Milho", "2026-11-12", weather)

    assert result.status == AdvisoryStatus.DESFAVORAVEL
    assert "CRITICAL_ROOT_MOISTURE_DEFICIT" in result.triggers_ativados
    assert result.score_confianca >= 70


def test_decision_dry_spell_risk(engine):
    """Verify alert when rain fell recently but 7-day forecast indicates 0mm and heat > 32C."""
    weather = {
        "chuva_acumulada_recente_mm": 25.0,  # Rain triggered false onset
        "chuva_iminente_48h_mm": 0.0,
        "previsao_7dias_mm": 0.5,           # Near 0 mm forecast
        "temperatura_max_7d_c": 33.5,       # Scorching heat > 32°C
        "humidade_solo_raiz": 0.38,
        "humidade_solo_superficie": 0.35,
        "is_fallback": False,
    }
    result = engine.evaluate("Huambo", "Milho", "2026-11-12", weather)

    # Must alert with AGUARDAR or DESFAVORAVEL due to false onset heat risk
    assert result.status in [AdvisoryStatus.AGUARDAR, AdvisoryStatus.DESFAVORAVEL]
    assert "DRY_SPELL_HEAT_RISK" in result.triggers_ativados


def test_decision_imminent_rain_recharge(engine):
    """Verify AGUARDAR when soil is dry but imminent rain >= 25 mm within 48h."""
    weather = {
        "chuva_acumulada_recente_mm": 8.0,
        "chuva_iminente_48h_mm": 32.0,      # Imminent heavy rain
        "previsao_7dias_mm": 60.0,
        "temperatura_max_7d_c": 26.0,
        "humidade_solo_raiz": 0.35,         # Below P25 currently
        "humidade_solo_superficie": 0.38,
        "is_fallback": False,
    }
    result = engine.evaluate("Huambo", "Milho", "2026-11-12", weather)

    assert result.status == AdvisoryStatus.AGUARDAR
    assert "CRITICAL_ROOT_MOISTURE_DEFICIT" in result.triggers_ativados
    assert "RECENT_RAIN_TRIGGER_SATISFIED" in result.triggers_ativados
