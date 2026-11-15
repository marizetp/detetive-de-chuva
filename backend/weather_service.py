"""Module 2: Real-Time & Climatological Weather Integration.

Provides weather intelligence tailored for both:
1. Operational day-of queries (live Open-Meteo observations and 7-day forecast).
2. Strategic crop planning queries (25-year NASA POWER climatological baseline expectations).
Supports province-level and sub-provincial / municipal coordinates.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple
import unicodedata
import time
import requests

try:
    from src.config import (
        PROVINCES,
        MUNICIPALITIES,
        OPEN_METEO_URL,
        WEATHER_REQUEST_TIMEOUT,
    )
    from src.baseline_engine import get_baseline_engine
except ImportError:
    from config import (
        PROVINCES,
        MUNICIPALITIES,
        OPEN_METEO_URL,
        WEATHER_REQUEST_TIMEOUT,
    )
    from baseline_engine import get_baseline_engine


class WeatherService:
    """Handles weather data retrieval: live Open-Meteo for today, climatological baseline for future planning."""

    def __init__(self, timeout: float = WEATHER_REQUEST_TIMEOUT):
        self.timeout = timeout
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_seconds = 600  # 10 minutes cache

    def _get_cache_key(self, provincia: str, query_date: str, municipio: Optional[str] = None) -> str:
        """Generates consistent cache key for province/municipality and query date."""
        return f"{provincia.lower()}_{municipio or 'none'}_{query_date}"

    def _resolve_coordinates(self, provincia: str, municipio: Optional[str] = None) -> Tuple[float, float, str]:
        """Resolves lat/lon, optionally using a specific municipality in the Central Plateau."""
        if municipio:
            norm = unicodedata.normalize("NFKD", municipio).encode("ASCII", "ignore").decode("utf-8").strip().lower()
            if norm in MUNICIPALITIES:
                m_info = MUNICIPALITIES[norm]
                return float(m_info["latitude"]), float(m_info["longitude"]), str(m_info["name"])

        prov_info = PROVINCES.get(provincia)
        if not prov_info:
            for p_name, p_data in PROVINCES.items():
                if p_name.lower() == provincia.lower():
                    prov_info = p_data
                    break

        if not prov_info:
            raise ValueError(f"Província não suportada: {provincia}")

        return float(prov_info["latitude"]), float(prov_info["longitude"]), str(prov_info["name"])

    def _generate_fallback(self, provincia: str, query_date: str, error_message: str = "") -> Dict[str, Any]:
        """Generates statistical climatological fallback metrics when Open-Meteo is unreachable."""
        return self._generate_strategic_climatology(
            provincia=provincia,
            query_date=query_date,
            place_name=provincia,
            is_fallback=True,
            error_msg=error_message,
        )

    def fetch_weather(
        self,
        provincia: str,
        query_date: str,
        municipio: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches weather data: live observations if query is today, or 25-year climatological baseline for future dates."""
        lat, lon, place_name = self._resolve_coordinates(provincia, municipio)
        cache_key = self._get_cache_key(provincia, query_date, municipio)
        now = time.time()

        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if now - entry["timestamp"] < self.cache_ttl_seconds:
                return entry["data"]

        today_str = date.today().isoformat()
        is_today = (query_date == today_str)

        # Strategic planning for future dates/months/years: use 25-year NASA POWER climatological baseline
        if not is_today:
            strat_weather = self._generate_strategic_climatology(provincia, query_date, place_name)
            self.cache[cache_key] = {"timestamp": now, "data": strat_weather}
            return strat_weather

        # Day-of query: fetch live Open-Meteo observations as auxiliary support
        try:
            live_data = self._call_open_meteo(lat, lon, query_date)
            parsed_weather = self._parse_open_meteo_response(live_data, query_date)
            parsed_weather["is_fallback"] = False
            parsed_weather["is_strategic_climatology"] = False
            parsed_weather["provincia"] = provincia
            parsed_weather["municipio"] = place_name if municipio else None
            self.cache[cache_key] = {"timestamp": now, "data": parsed_weather}
            return parsed_weather

        except Exception as e:
            print(f"[!] Aviso: Chamada à Open-Meteo falhou ({e}). Utilizando fallback climatológico da linha de base.")
            fallback_weather = self._generate_strategic_climatology(
                provincia, query_date, place_name, is_fallback=True, error_msg=str(e)
            )
            self.cache[cache_key] = {"timestamp": now, "data": fallback_weather}
            return fallback_weather

    def _call_open_meteo(self, lat: float, lon: float, query_date: str) -> Dict[str, Any]:
        """Executes HTTP request to Open-Meteo API (up to 16 days forecast)."""
        params = {
            "latitude": lat,
            "longitude": lon,
            "past_days": 7,
            "forecast_days": 16,
            "daily": ["precipitation_sum", "temperature_2m_max", "temperature_2m_min"],
            "hourly": ["soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm"],
            "timezone": "Africa/Luanda",
        }

        response = requests.get(OPEN_METEO_URL, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _parse_open_meteo_response(self, data: Dict[str, Any], query_date: str) -> Dict[str, Any]:
        """Parses raw Open-Meteo payload into structured agricultural metrics."""
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})

        dates = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])
        t_max = daily.get("temperature_2m_max", [])
        t_min = daily.get("temperature_2m_min", [])

        # Identify today's index in daily series
        today_str = query_date
        today_idx = 7
        if today_str in dates:
            today_idx = dates.index(today_str)
        elif len(dates) > 7:
            today_idx = 7

        # Past 3 to 5 days rainfall calculation
        past_start_3d = max(0, today_idx - 3)
        past_start_5d = max(0, today_idx - 5)

        rain_past_3d = sum([p for p in precip[past_start_3d:today_idx] if p is not None])
        rain_past_5d = sum([p for p in precip[past_start_5d:today_idx] if p is not None])
        rain_recent = max(rain_past_3d, rain_past_5d)

        # Imminent rain (next 48h)
        imminent_end = min(len(precip), today_idx + 2)
        rain_imminent_48h = sum([p for p in precip[today_idx:imminent_end] if p is not None])

        # Next 7 days and 16 days forecast precipitation and temperatures
        forecast_end_7d = min(len(precip), today_idx + 7)
        forecast_end_16d = min(len(precip), today_idx + 16)
        forecast_precip_slice_7d = [p for p in precip[today_idx:forecast_end_7d] if p is not None]
        forecast_precip_slice_16d = [p for p in precip[today_idx:forecast_end_16d] if p is not None]
        rain_forecast_7d = sum(forecast_precip_slice_7d)
        rain_forecast_16d = sum(forecast_precip_slice_16d)

        forecast_tmax_slice = [t for t in t_max[today_idx:forecast_end_7d] if t is not None]
        forecast_tmin_slice = [t for t in t_min[today_idx:forecast_end_7d] if t is not None]

        max_temp_7d = max(forecast_tmax_slice) if forecast_tmax_slice else 28.0
        min_temp_7d = min(forecast_tmin_slice) if forecast_tmin_slice else 15.0
        avg_temp_7d = (max_temp_7d + min_temp_7d) / 2.0

        # Soil Moisture from hourly readings
        sm_0_7_list = [x for x in hourly.get("soil_moisture_0_to_7cm", []) if x is not None]
        sm_7_28_list = [x for x in hourly.get("soil_moisture_7_to_28cm", []) if x is not None]
        sm_28_100_list = [x for x in hourly.get("soil_moisture_28_to_100cm", []) if x is not None]

        surface_moisture = float(sum(sm_0_7_list[-6:]) / len(sm_0_7_list[-6:])) if sm_0_7_list else 0.45

        if sm_7_28_list and sm_28_100_list:
            root_7_28 = sum(sm_7_28_list[-6:]) / len(sm_7_28_list[-6:])
            root_28_100 = sum(sm_28_100_list[-6:]) / len(sm_28_100_list[-6:])
            root_moisture = float((root_7_28 * 0.6) + (root_28_100 * 0.4))
        elif sm_7_28_list:
            root_moisture = float(sum(sm_7_28_list[-6:]) / len(sm_7_28_list[-6:]))
        else:
            root_moisture = 0.42

        return {
            "chuva_acumulada_recente_mm": round(rain_recent, 1),
            "chuva_acumulada_3d_mm": round(rain_past_3d, 1),
            "chuva_acumulada_5d_mm": round(rain_past_5d, 1),
            "chuva_iminente_48h_mm": round(rain_imminent_48h, 1),
            "previsao_7dias_mm": round(rain_forecast_7d, 1),
            "previsao_16dias_mm": round(rain_forecast_16d, 1),
            "temperatura_max_7d_c": round(max_temp_7d, 1),
            "temperatura_min_7d_c": round(min_temp_7d, 1),
            "temperatura_media_7d_c": round(avg_temp_7d, 1),
            "humidade_solo_superficie": round(surface_moisture, 3),
            "humidade_solo_raiz": round(root_moisture, 3),
            "datas_previsao": dates[today_idx:forecast_end_7d],
            "chuva_diaria_previsao": forecast_precip_slice_7d,
            "datas_previsao_16d": dates[today_idx:forecast_end_16d],
            "chuva_diaria_previsao_16d": forecast_precip_slice_16d,
        }

    def _generate_strategic_climatology(
        self,
        provincia: str,
        query_date: str,
        place_name: str,
        is_fallback: bool = False,
        error_msg: str = "",
    ) -> Dict[str, Any]:
        """Generates statistical climatological expectations based on 25 years of NASA POWER data."""
        try:
            target_dt = datetime.strptime(query_date, "%Y-%m-%d")
        except ValueError:
            target_dt = datetime.now()

        month = target_dt.month
        week = min(max(target_dt.isocalendar()[1], 1), 52)

        engine = get_baseline_engine()
        m_stats = engine.get_province_month_stats(provincia, month)
        w_stats = engine.get_province_week_stats(provincia, week)

        avg_monthly_rain = float(m_stats.get("chuva_media_mensal_mm", 150.0))
        daily_rain_rate = avg_monthly_rain / 30.0

        rain_recent = round(daily_rain_rate * 3.5, 1)
        rain_3d = round(daily_rain_rate * 3.0, 1)
        rain_5d = round(daily_rain_rate * 5.0, 1)
        rain_48h = round(daily_rain_rate * 2.0, 1)
        rain_7d = round(daily_rain_rate * 7.0, 1)

        root_moisture = float(m_stats.get("gwetroot_p50", 0.45))
        surface_moisture = float(m_stats.get("gwettop_media", 0.48))
        t_max = float(m_stats.get("temperatura_max_c", 26.5))
        t_min = float(m_stats.get("temperatura_min_c", 15.5))
        t_mean = float(m_stats.get("temperatura_media_c", 20.5))

        return {
            "chuva_acumulada_recente_mm": rain_recent,
            "chuva_acumulada_3d_mm": rain_3d,
            "chuva_acumulada_5d_mm": rain_5d,
            "chuva_iminente_48h_mm": rain_48h,
            "previsao_7dias_mm": rain_7d,
            "temperatura_max_7d_c": t_max,
            "temperatura_min_7d_c": t_min,
            "temperatura_media_7d_c": t_mean,
            "humidade_solo_superficie": surface_moisture,
            "humidade_solo_raiz": root_moisture,
            "is_fallback": is_fallback,
            "is_strategic_climatology": True,
            "provincia": provincia,
            "municipio": place_name,
            "fallback_reason": error_msg if is_fallback else None,
        }

    def fetch_seasonal_outlook(self, provincia: str, municipio: Optional[str] = None) -> Dict[str, Any]:
        """Fetches 6-month seasonal outlook from Open-Meteo Seasonal API (ECMWF SEAS5/NCEP CFS)."""
        lat, lon, place_name = self._resolve_coordinates(provincia, municipio)
        cache_key = f"seasonal_{provincia.lower()}_{municipio or 'none'}"
        now = time.time()

        if cache_key in self.cache and (now - self.cache[cache_key]["timestamp"] < 3600):
            return self.cache[cache_key]["data"]

        url = "https://seasonal-api.open-meteo.com/v1/seasonal"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": ["precipitation_sum", "temperature_2m_mean"],
            "models": "ecmwf_seas5",
            "forecast_days": 180,
            "timezone": "Africa/Luanda",
        }
        try:
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            raw = resp.json()
            daily = raw.get("daily", {})
            times = daily.get("time", [])
            # Aggregate ensemble members if present (precipitation_sum_member01, etc.) or direct key
            precip_keys = [k for k in daily.keys() if k.startswith("precipitation_sum")]
            temp_keys = [k for k in daily.keys() if k.startswith("temperature_2m_mean")]

            monthly_agg: Dict[str, Dict[str, Any]] = {}
            for i, dt_str in enumerate(times):
                ym = dt_str[:7]
                p_vals = [daily[k][i] for k in precip_keys if i < len(daily[k]) and daily[k][i] is not None]
                t_vals = [daily[k][i] for k in temp_keys if i < len(daily[k]) and daily[k][i] is not None]
                if ym not in monthly_agg:
                    monthly_agg[ym] = {"precip_sum": 0.0, "temp_list": [], "days": 0}
                if p_vals:
                    monthly_agg[ym]["precip_sum"] += sum(p_vals) / len(p_vals)
                if t_vals:
                    monthly_agg[ym]["temp_list"].append(sum(t_vals) / len(t_vals))
                monthly_agg[ym]["days"] += 1

            months_out = []
            for ym, vals in sorted(monthly_agg.items())[:6]:
                avg_t = sum(vals["temp_list"]) / len(vals["temp_list"]) if vals["temp_list"] else None
                months_out.append({
                    "mes": ym,
                    "chuva_esperada_mm": round(vals["precip_sum"], 1),
                    "temperatura_media_c": round(avg_t, 1) if avg_t is not None else None,
                    "dias_cobertos": vals["days"],
                })

            result = {
                "estado": "ok",
                "fonte": "Open-Meteo Seasonal (ECMWF SEAS5)",
                "rotulo": "previsão sazonal (6 meses), não é climatologia nem certeza",
                "provincia": provincia,
                "municipio": place_name,
                "previsao_mensal_6m": months_out,
            }
            self.cache[cache_key] = {"timestamp": now, "data": result}
            return result
        except Exception as e:
            return {
                "estado": "falhou",
                "erro": str(e),
                "fonte": "Open-Meteo Seasonal",
                "provincia": provincia,
                "municipio": place_name,
                "previsao_mensal_6m": [],
            }


_weather_instance: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    global _weather_instance
    if _weather_instance is None:
        _weather_instance = WeatherService()
    return _weather_instance
