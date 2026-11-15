"""Extractor for NASA GPM IMERG V07 NetCDF files into AgroKairos contract CSVs.

Reads the 25 seasonal NetCDF files (imerg_2000.nc to imerg_2024.nc) in data/IMERG_V07_2000-2024,
extracts daily precipitation (mm/day) for the nearest pixel to Huambo, Bié, and Huíla,
merges complementary GWETROOT and T2M columns from the raw NASA POWER JSON files for exact
same dates (replacing -999/-9999 with NaN/empty cell), and writes:
  - data/hist_imerg_huambo.csv
  - data/hist_imerg_bie.csv
  - data/hist_imerg_huila.csv
along with SHA-256 checksums in data/imerg_manifest.json.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, Any, List
import re

import numpy as np
import pandas as pd

try:
    from src.config import PROVINCES, DATA_DIR
except ImportError:
    from config import PROVINCES, DATA_DIR


IMERG_NC_DIR = DATA_DIR / "IMERG_V07_2000-2024"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_power_complementary(raw_filename: str) -> pd.DataFrame:
    """Loads GWETROOT and T2M from raw NASA POWER JSON indexed by YYYY-MM-DD."""
    path = DATA_DIR / raw_filename
    if not path.exists():
        return pd.DataFrame(columns=["gwetroot", "t2m"])

    raw = json.loads(path.read_text(encoding="utf-8"))
    params = raw.get("properties", {}).get("parameter", {})
    gwet = params.get("GWETROOT", {})
    t2m = params.get("T2M", {})

    rows = {}
    all_keys = set(gwet.keys()) | set(t2m.keys())
    for k in all_keys:
        if len(k) == 8 and k.isdigit():
            iso = f"{k[:4]}-{k[4:6]}-{k[6:8]}"
            g_val = gwet.get(k)
            t_val = t2m.get(k)
            g_clean = np.nan if (g_val is None or float(g_val) <= -900) else round(float(g_val), 4)
            t_clean = np.nan if (t_val is None or float(t_val) <= -900) else round(float(t_val), 2)
            rows[iso] = {"gwetroot": g_clean, "t2m": t_clean}

    df = pd.DataFrame.from_dict(rows, orient="index")
    df.index.name = "data"
    return df


def extract_all_provinces() -> Dict[str, Any]:
    """Extracts 25-year daily IMERG V07 series for all configured provinces."""
    import netCDF4 as nc

    if not IMERG_NC_DIR.exists():
        raise FileNotFoundError(f"IMERG directory not found: {IMERG_NC_DIR}")

    nc_files = sorted(IMERG_NC_DIR.glob("imerg_*.nc"))
    if not nc_files:
        raise FileNotFoundError(f"No imerg_*.nc files found in {IMERG_NC_DIR}")

    manifest: Dict[str, Any] = {
        "source": "NASA GPM IMERG V07 (GPM_3IMERGDF)",
        "files_processed": len(nc_files),
        "provinces": {},
    }

    # Read grid coordinates from first file
    with nc.Dataset(str(nc_files[0]), "r") as ds0:
        lats = np.array(ds0.variables["lat"][:], dtype=float)
        lons = np.array(ds0.variables["lon"][:], dtype=float)
        product_name = getattr(ds0, "produto", "GPM_3IMERGDF")
        product_version = str(getattr(ds0, "versao_produto", "07"))

    manifest["produto"] = product_name
    manifest["versao_produto"] = product_version

    # Pre-resolve pixel indices for each province
    province_pixels: Dict[str, Dict[str, Any]] = {}
    for prov_name, prov_cfg in PROVINCES.items():
        target_lat = float(prov_cfg["latitude"])
        target_lon = float(prov_cfg["longitude"])
        lat_idx = int(np.argmin(np.abs(lats - target_lat)))
        lon_idx = int(np.argmin(np.abs(lons - target_lon)))
        province_pixels[prov_cfg["id"]] = {
            "name": prov_name,
            "target_lat": target_lat,
            "target_lon": target_lon,
            "pixel_lat": round(float(lats[lat_idx]), 4),
            "pixel_lon": round(float(lons[lon_idx]), 4),
            "lat_idx": lat_idx,
            "lon_idx": lon_idx,
            "raw_file": prov_cfg["raw_file"],
            "records": [],
        }

    # Iterate through each seasonal NetCDF file
    for nc_path in nc_files:
        m = re.search(r"imerg_(\d{4})\.nc", nc_path.name)
        if not m:
            continue
        season_year = int(m.group(1))
        base_date = date(season_year, 9, 1)

        with nc.Dataset(str(nc_path), "r") as ds:
            time_offsets = np.array(ds.variables["time"][:], dtype=int)
            precip_var = ds.variables["precipitation"]

            # Extract full time slice for each province pixel
            for prov_id, p_info in province_pixels.items():
                series = np.array(
                    precip_var[:, p_info["lat_idx"], p_info["lon_idx"]],
                    dtype=float,
                )
                for offset, val in zip(time_offsets, series):
                    dt_str = (base_date + timedelta(days=int(offset))).isoformat()
                    clean_val = np.nan if (np.isnan(val) or val < 0) else round(float(val), 3)
                    p_info["records"].append({"data": dt_str, "chuva_mm": clean_val})

    # Write contract CSVs
    for prov_id, p_info in province_pixels.items():
        df_rain = pd.DataFrame(p_info["records"]).drop_duplicates(subset=["data"]).sort_values("data")
        df_power = load_power_complementary(p_info["raw_file"])

        df_merged = df_rain.merge(df_power, on="data", how="left")
        out_csv = DATA_DIR / f"hist_imerg_{prov_id}.csv"
        # Missing values written as empty string (never -999 or -9999)
        df_merged.to_csv(out_csv, index=False, na_rep="")

        valid_rain = int(df_merged["chuva_mm"].notna().sum())
        total_rows = int(len(df_merged))
        manifest["provinces"][prov_id] = {
            "nome": p_info["name"],
            "csv_file": out_csv.name,
            "sha256": sha256_file(out_csv),
            "target_coords": {"lat": p_info["target_lat"], "lon": p_info["target_lon"]},
            "imerg_pixel_coords": {"lat": p_info["pixel_lat"], "lon": p_info["pixel_lon"]},
            "total_rows": total_rows,
            "valid_rain_days": valid_rain,
            "coverage_pct": round((valid_rain / total_rows) * 100, 2) if total_rows else 0.0,
            "date_range": {
                "start": str(df_merged["data"].iloc[0]),
                "end": str(df_merged["data"].iloc[-1]),
            },
        }

    manifest_path = DATA_DIR / "imerg_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = extract_all_provinces()
    print(json.dumps(result, ensure_ascii=False, indent=2))
