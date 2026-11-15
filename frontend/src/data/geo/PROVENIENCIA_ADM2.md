# Provenance — `angola-municipios-planalto-2006.json`

Simplified municipal boundaries (ADM2) for Angola's Central Plateau (**Huambo — 11 municipalities**, **Bié — 9 municipalities**, and **Huíla — 13 municipalities**; **33 polygons total**) prepared for interactive SVG rendering on `/ciclo`.

> **Disclaimer.** These boundaries are provided solely for visual geographic context and agroclimatic exploration.

## 1. Source

| Field | Value |
|---|---|
| Dataset | geoBoundaries — gbOpen, Angola (AGO), level ADM2 (Municipality) |
| `boundaryID` | `AGO-ADM2-91424787` |
| Reference year | 2006 |
| Boundary source | geoBoundaries / Wikimedia Commons |
| License | **Public Domain** (`boundaryLicense`) |
| Repository | `https://github.com/wmgeolab/geoBoundaries` (commit `9469f09592ced973a3448cf66b6100b741b64c0d`) |
| Source file | `releaseData/gbOpen/AGO/ADM2/geoBoundaries-AGO-ADM2.geojson` (19,754,449 bytes) |

Citation: Runfola, D. et al. (2020) *geoBoundaries: A global database of political administrative boundaries.* PLoS ONE 15(4): e0231866.

## 2. Simplification

Filtered to the 33 ADM2 municipalities intersecting Huambo (`AO-HUA`), Bié (`AO-BIE`), and Huíla (`AO-HUI`), simplified via **mapshaper 0.7.101** (`-simplify interval=300 keep-shapes`, `precision=0.0001`, RFC 7946 GeoJSON) to `147,460 bytes`.
