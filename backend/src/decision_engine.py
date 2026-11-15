"""Module 3: Strategic Agroclimatic Decision Engine.

Evaluates agroclimatic criteria, crop-specific biological profiles,
and long-term NASA POWER historical baselines to generate deterministic
verdicts (FAVORAVEL, AGUARDAR, DESFAVORAVEL), confidence scores,
and resource-protection justifications.
"""

from datetime import datetime, date
from typing import Dict, Any, List, Tuple
try:
    from src.schemas import AdvisoryStatus, AdvisoryMetrics, DecisionEvaluationResult
    from src.config import (
        CRITICAL_RAIN_3D_TRIGGER,
        IMMINENT_RAIN_48H_TRIGGER,
        DRY_SPELL_MAX_TEMP,
        DRY_SPELL_RAIN_LIMIT,
        CROP_PROFILES,
        CROPS,
    )
    from src.baseline_engine import get_baseline_engine
except ImportError:
    from schemas import AdvisoryStatus, AdvisoryMetrics, DecisionEvaluationResult
    from config import (
        CRITICAL_RAIN_3D_TRIGGER,
        IMMINENT_RAIN_48H_TRIGGER,
        DRY_SPELL_MAX_TEMP,
        DRY_SPELL_RAIN_LIMIT,
        CROP_PROFILES,
        CROPS,
    )
    from baseline_engine import get_baseline_engine


class DecisionEngine:
    """Deterministic agronomic rule engine supporting strategic crop planning and resource protection."""

    def __init__(self):
        self.baseline_engine = get_baseline_engine()

    def evaluate(
        self,
        provincia: str,
        cultura: str,
        data_consulta: Any,
        weather_data: Dict[str, Any],
        lang: str = "pt",
    ) -> DecisionEvaluationResult:
        """Evaluates agroclimatic criteria based on crop profiles and historical/current conditions."""
        is_en = str(lang or "pt").strip().lower().startswith("en")
        norm_lang = "en" if is_en else "pt"
        if not data_consulta or not isinstance(data_consulta, str):
            data_consulta = date.today().isoformat()
        try:
            query_dt = datetime.strptime(str(data_consulta), "%Y-%m-%d")
        except ValueError:
            query_dt = datetime.now()

        month = query_dt.month
        week = min(max(query_dt.isocalendar()[1], 1), 52)

        # Retrieve historical baseline matrices
        month_stats = self.baseline_engine.get_province_month_stats(provincia, month)
        week_stats = self.baseline_engine.get_province_week_stats(provincia, week)

        p25_root = float(month_stats.get("gwetroot_p25", 0.40))
        p50_root = float(month_stats.get("gwetroot_p50", 0.47))
        p75_root = float(month_stats.get("gwetroot_p75", 0.53))
        avg_monthly_rain = float(month_stats.get("chuva_media_mensal_mm", 0.0))
        prob_sementeira_semanal = float(week_stats.get("probabilidade_sementeira_pct", 50.0))

        # Weather / Climatological indicators
        rain_recent = float(weather_data.get("chuva_acumulada_recente_mm", 0.0))
        rain_48h = float(weather_data.get("chuva_iminente_48h_mm", 0.0))
        rain_7d = float(weather_data.get("previsao_7dias_mm", 0.0))
        root_moisture = float(weather_data.get("humidade_solo_raiz", 0.40))
        surface_moisture = float(weather_data.get("humidade_solo_superficie", 0.40))
        t_max_7d = float(weather_data.get("temperatura_max_7d_c", 26.0))
        is_strategic = bool(weather_data.get("is_strategic_climatology", False))

        # Crop-specific biological profile
        crop_cfg = CROP_PROFILES.get(cultura, CROP_PROFILES.get("Milho", {}))
        min_3d_rain = float(crop_cfg.get("min_rain_3d_mm", 20.0))
        min_monthly_rain = float(crop_cfg.get("min_monthly_rain_mm", 110.0))
        min_abs_root_moisture = float(crop_cfg.get("min_absolute_root_moisture", 0.35))
        waterlogging_limit = float(crop_cfg.get("waterlogging_limit", 0.85))
        crit_tmax = float(crop_cfg.get("critical_temp_max", 32.0))
        depth_cm = int(crop_cfg.get("sowing_depth_cm", 5))

        triggers_ativados: List[str] = []
        justificacoes: List[str] = []

        # --- HEURISTIC IDENTIFIERS ---
        is_dry_season = month in [5, 6, 7, 8]  # Maio a Agosto (Cacimbo no Planalto Central)
        is_root_below_floor = (root_moisture < min_abs_root_moisture) or (root_moisture < p25_root)
        recent_rain_met = (rain_recent >= min_3d_rain)
        imminent_rain_met = (rain_48h >= IMMINENT_RAIN_48H_TRIGGER)

        if recent_rain_met or imminent_rain_met:
            triggers_ativados.append("RECENT_RAIN_TRIGGER_SATISFIED")

        if is_root_below_floor or root_moisture < p25_root:
            triggers_ativados.append("CRITICAL_ROOT_MOISTURE_DEFICIT")

        # Waterlogging detection (critical for beans which rot in saturated soil)
        is_waterlogged = (root_moisture > waterlogging_limit) and (rain_7d >= 70.0 or rain_recent >= 50.0)
        if is_waterlogged:
            triggers_ativados.append("WATERLOGGING_RISK")

        # Soy-specific germination check
        is_soy_deficit = (cultura == "Soja") and (root_moisture < 0.40 or (rain_recent < 22.0 and not is_strategic))
        if is_soy_deficit and not is_dry_season:
            triggers_ativados.append("SOYBEAN_GERMINATION_MOISTURE_DEFICIT")

        # Dry spell risk (false onset)
        dry_spell_risk = (
            not is_strategic
            and (rain_recent >= 15.0 or is_root_below_floor)
            and (rain_7d <= DRY_SPELL_RAIN_LIMIT)
            and (t_max_7d >= crit_tmax)
        )
        if dry_spell_risk:
            triggers_ativados.append("DRY_SPELL_HEAT_RISK")

        # --- STATUS DETERMINATION ---
        status, confidence_score = self._compute_status_and_score(
            is_dry_season=is_dry_season,
            prob_sementeira_semanal=prob_sementeira_semanal,
            avg_monthly_rain=avg_monthly_rain,
            min_monthly_rain=min_monthly_rain,
            root_moisture=root_moisture,
            min_abs_root_moisture=min_abs_root_moisture,
            p25_root=p25_root,
            p50_root=p50_root,
            is_waterlogged=is_waterlogged,
            is_soy_deficit=is_soy_deficit,
            dry_spell_risk=dry_spell_risk,
            rain_recent=rain_recent,
            min_3d_rain=min_3d_rain,
            rain_48h=rain_48h,
            rain_7d=rain_7d,
            month=month,
            is_strategic=is_strategic,
        )

        crop_display = crop_cfg.get("name_en", cultura) if is_en else cultura

        # --- STRUCTURED JUSTIFICATIONS ---
        if status == AdvisoryStatus.DESFAVORAVEL:
            triggers_ativados.append("SEASONAL_DROUGHT_RISK")
            triggers_ativados.append("CAPITAL_PROTECTION_ALERT")
            if is_dry_season:
                if is_en:
                    justificacoes.append(
                        f"Seasonal dry period (Cacimbo): historical average rainfall ({avg_monthly_rain:.1f} mm/month) "
                        f"is insufficient for {crop_display} (minimum requirement: {min_monthly_rain:.1f} mm)."
                    )
                    justificacoes.append(
                        f"Estimated root-zone soil moisture ({root_moisture:.2f}) is well below the biological floor ({min_abs_root_moisture:.2f})."
                    )
                    justificacoes.append(
                        "Capital protection alert: rainfed sowing during this period carries near-total resource loss risk "
                        "(seeds, fertilizer, and labor). Reserve investment for the rainy season."
                    )
                else:
                    justificacoes.append(
                        f"Período de estiagem sazonal (Cacimbo): precipitação média histórica ({avg_monthly_rain:.1f} mm/mês) "
                        f"é totalmente insuficiente para a cultura de {cultura} (exigência mínima: {min_monthly_rain:.1f} mm)."
                    )
                    justificacoes.append(
                        f"Reserva hídrica do solo estimada em {root_moisture:.2f}, muito abaixo do limiar biológico ({min_abs_root_moisture:.2f})."
                    )
                    justificacoes.append(
                        "Alerta de proteção de capital: semear nesta época em regime de sequeiro causará perda de 100% dos recursos "
                        "(sementes, fertilizantes e custo de mão-de-obra). Recomenda-se reservar o investimento para a época chuvosa."
                    )
            else:
                if is_en:
                    justificacoes.append(
                        f"Unfavorable agroclimatic conditions for {crop_display}: historical weekly sowing suitability is only {prob_sementeira_semanal:.1f}%."
                    )
                    justificacoes.append(
                        f"Root-zone soil moisture ({root_moisture:.2f}) and expected rainfall ({rain_7d:.1f} mm) do not support uniform germination."
                    )
                else:
                    justificacoes.append(
                        f"Condições agroclimáticas desfavoráveis para {cultura}: probabilidade de sementeira viável de apenas {prob_sementeira_semanal:.1f}%."
                    )
                    justificacoes.append(
                        f"Humidade na raiz ({root_moisture:.2f}) e chuvas esperadas ({rain_7d:.1f} mm) não garantem germinação uniforme."
                    )

        elif status == AdvisoryStatus.AGUARDAR:
            if is_waterlogged:
                if is_en:
                    justificacoes.append(
                        f"Root asphyxiation and waterlogging risk: root-zone moisture ({root_moisture:.2f}) exceeds {crop_display} tolerance "
                        f"({waterlogging_limit:.2f}) alongside heavy forecast rainfall ({rain_7d:.1f} mm)."
                    )
                    justificacoes.append("Seeds face severe rot risk in saturated soil. Wait for field drainage before sowing.")
                else:
                    justificacoes.append(
                        f"Risco de asfixia radicular e encharcamento: humidade no solo ({root_moisture:.2f}) excede o limite de tolerância "
                        f"do {cultura} ({waterlogging_limit:.2f}) com previsão de chuvas intensas ({rain_7d:.1f} mm)."
                    )
                    justificacoes.append("As sementes correm risco severo de apodrecimento no solo. Aguarde a drenagem do terreno.")
            elif dry_spell_risk:
                if is_en:
                    justificacoes.append(
                        f"False-start / dry-spell risk: high heat forecast ({t_max_7d:.1f}°C) with near-zero rainfall over the next 7 days ({rain_7d:.1f} mm)."
                    )
                    justificacoes.append("Wait for rainfall patterns to stabilize to avoid scorching newly germinated seedlings.")
                else:
                    justificacoes.append(
                        f"Risco de falsa partida / veranico: previsão de calor excessivo ({t_max_7d:.1f}°C) e ausência de chuva nos próximos 7 dias ({rain_7d:.1f} mm)."
                    )
                    justificacoes.append("Aguarde a regularização do regime de chuvas para evitar a queima das sementes germinadas.")
            elif is_soy_deficit:
                if is_en:
                    justificacoes.append(
                        f"Soybean requires high water absorption (~50% of seed weight) and firm soil moisture reserve (>= 0.40). "
                        f"Current/expected moisture ({root_moisture:.2f}) is not yet sufficient for uniform emergence."
                    )
                    justificacoes.append("Wait for full root-zone soil moisture recharge.")
                else:
                    justificacoes.append(
                        f"A cultura da Soja exige alta absorção de água (~50% do seu peso) e solo com reserva firme (>= 0.40). "
                        f"A humidade atual/esperada ({root_moisture:.2f}) ainda é insuficiente para emergência uniforme."
                    )
                    justificacoes.append("Recomenda-se aguardar a plena recarga hídrica do solo.")
            else:
                if is_en:
                    justificacoes.append(
                        f"Transitional agroclimatic window: moderate historical sowing probability ({prob_sementeira_semanal:.1f}%), "
                        f"with rainfall still consolidating ({avg_monthly_rain:.1f} mm/month)."
                    )
                    justificacoes.append(
                        "Finish land preparation, plowing, and soil amendment while waiting for steady rainfall onset."
                    )
                else:
                    justificacoes.append(
                        f"Janela agroclimática de transição: probabilidade histórica de sementeira moderada ({prob_sementeira_semanal:.1f}%), "
                        f"com chuvas em consolidação ({avg_monthly_rain:.1f} mm/mês)."
                    )
                    justificacoes.append(
                        "Recomenda-se concluir a preparação da terra, aragem e correção do solo, aguardando o estabelecimento definitivo das chuvas."
                    )

        else:  # FAVORAVEL
            triggers_ativados.append("FAVORABLE_HISTORICAL_WINDOW")
            triggers_ativados.append("SATISFIED_CROP_WATER_REQUIREMENT")
            if is_en:
                justificacoes.append(
                    f"Favorable and stable agroclimatic window for {crop_display}: historical sowing suitability probability of {prob_sementeira_semanal:.1f}%."
                )
                justificacoes.append(
                    f"Average rainfall of {avg_monthly_rain:.1f} mm/month satisfies the crop requirement ({min_monthly_rain:.1f} mm)."
                )
                justificacoes.append(
                    f"Root-zone water reserve ({root_moisture:.2f}) supports vigorous germination at {depth_cm} cm sowing depth."
                )
            else:
                justificacoes.append(
                    f"Período agroclimático favorável e estável para sementeira de {cultura}: probabilidade histórica de sucesso de {prob_sementeira_semanal:.1f}%."
                )
                justificacoes.append(
                    f"Precipitação média de {avg_monthly_rain:.1f} mm/mês satisfaz plenamente a demanda da cultura ({min_monthly_rain:.1f} mm)."
                )
                justificacoes.append(
                    f"Reserva de água na raiz ({root_moisture:.2f}) compatível com germinação vigorosa na profundidade de {depth_cm} cm."
                )

        metrics = AdvisoryMetrics(
            chuva_acumulada_recente_mm=round(rain_recent, 1),
            humidade_solo_raiz=round(root_moisture, 3),
            previsao_7dias_mm=round(rain_7d, 1),
        )

        return DecisionEvaluationResult(
            status=status,
            score_confianca=confidence_score,
            triggers_ativados=triggers_ativados,
            justificacoes_tecnicas=justificacoes,
            metricas=metrics,
            is_fallback_weather=bool(weather_data.get("is_fallback", False)),
            content_language=norm_lang,
            detalhes_agroclimaticos={
                "provincia": provincia,
                "cultura": cultura,
                "data_consulta": str(data_consulta),
                "mes": month,
                "semana_iso": week,
                "p25_root": p25_root,
                "p50_raiz_historico": p50_root,
                "p75_raiz_historico": p75_root,
                "prob_sementeira_semanal": prob_sementeira_semanal,
                "chuva_media_mensal_mm": avg_monthly_rain,
                "temperatura_media_c": month_stats.get("temperatura_media_c", 20.0),
                "temperatura_max_c": t_max_7d,
                "surface_moisture": surface_moisture,
                "is_strategic": is_strategic,
                "sowing_depth_cm": depth_cm,
            },
        )

    def _compute_status_and_score(
        self,
        is_dry_season: bool,
        prob_sementeira_semanal: float,
        avg_monthly_rain: float,
        min_monthly_rain: float,
        root_moisture: float,
        min_abs_root_moisture: float,
        p25_root: float,
        p50_root: float,
        is_waterlogged: bool,
        is_soy_deficit: bool,
        dry_spell_risk: bool,
        rain_recent: float,
        min_3d_rain: float,
        rain_48h: float,
        rain_7d: float,
        month: int,
        is_strategic: bool,
    ) -> Tuple[AdvisoryStatus, int]:
        """Calculates deterministic status and confidence score."""
        is_root_below_floor = (root_moisture < min_abs_root_moisture) or (root_moisture < p25_root)
        recent_rain_met = (rain_recent >= min_3d_rain)
        imminent_rain_met = (rain_48h >= IMMINENT_RAIN_48H_TRIGGER)

        # Case 1: Cacimbo / Dry season or extreme precipitation deficit -> DESFAVORAVEL
        if is_dry_season or prob_sementeira_semanal < 28.0 or avg_monthly_rain < (min_monthly_rain * 0.40):
            score = 90 if is_dry_season else 82
            if root_moisture < min_abs_root_moisture:
                score += 5
            return AdvisoryStatus.DESFAVORAVEL, min(score, 95)

        # Case 2: Waterlogging risk (e.g. Beans in flooded soil) -> AGUARDAR
        if is_waterlogged:
            return AdvisoryStatus.AGUARDAR, 85

        # Case 3: False onset / Dry spell risk -> AGUARDAR
        if dry_spell_risk:
            return AdvisoryStatus.AGUARDAR, 85

        # Case 4: Critical root moisture deficit
        if is_root_below_floor:
            if imminent_rain_met:
                # Strong rain imminent in 48h: AGUARDAR for water to soak into root zone
                return AdvisoryStatus.AGUARDAR, 82
            if not imminent_rain_met and rain_7d < 12.0:
                # Root is dry and no rain ahead: DESFAVORAVEL
                return AdvisoryStatus.DESFAVORAVEL, 85
            return AdvisoryStatus.AGUARDAR, 75

        # Case 5: Specific moisture deficit (e.g. Soy) -> AGUARDAR
        if is_soy_deficit:
            return AdvisoryStatus.AGUARDAR, 80

        # Case 6: Root moisture is good and rain trigger satisfied -> FAVORAVEL
        if (recent_rain_met or imminent_rain_met) and (rain_7d >= 15.0 or rain_recent >= 25.0):
            score = int(65 + (prob_sementeira_semanal * 0.25))
            if root_moisture >= p50_root:
                score += 5
            return AdvisoryStatus.FAVORAVEL, min(max(score, 75), 95)

        # Case 7: Transition periods (probability < 55% or monthly rain below threshold)
        if prob_sementeira_semanal < 55.0 or avg_monthly_rain < min_monthly_rain:
            return AdvisoryStatus.AGUARDAR, 78

        # Case 8: Established Rainy Season
        if prob_sementeira_semanal >= 55.0 and avg_monthly_rain >= min_monthly_rain:
            score = int(65 + (prob_sementeira_semanal * 0.25))
            if root_moisture >= p50_root:
                score += 5
            return AdvisoryStatus.FAVORAVEL, min(max(score, 75), 95)

        return AdvisoryStatus.AGUARDAR, 72


_decision_engine_instance = None


def get_decision_engine() -> DecisionEngine:
    global _decision_engine_instance
    if _decision_engine_instance is None:
        _decision_engine_instance = DecisionEngine()
    return _decision_engine_instance
