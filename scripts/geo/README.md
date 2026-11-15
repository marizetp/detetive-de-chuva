# Geographic data preparation

Builds and validates `frontend/src/data/geo/angola-provincias-2021.json` from a pinned version of
geoBoundaries. Full provenance is recorded in `frontend/src/data/geo/PROVENIENCIA.md` (in Portuguese).

These scripts are **not part of the application**: they live outside `frontend/`, are not imported
by the code, are not included in the Vite bundle and add no dependencies to `package.json`.

## Requirements

- Node.js ≥ 22 (native modules only: `fetch`, `crypto`, `zlib`, `child_process`).
- `npx` (ships with npm). mapshaper runs at the pinned version **0.7.101** via
  `npx --yes mapshaper@0.7.101`; npm keeps it in its cache, outside the project.
- Network access on the first run (source ≈ 5.8 MB). The source is cached in
  `<system temporary folder>/detetive-da-chuva-geo`, or in the folder given by `GEO_WORK_DIR`.

## Commands (from the repository root)

```sh
# Confirm that the existing file is reproducible (writes nothing)
node scripts/geo/build.mjs --check

# Build again, validate and replace the final file only if it is valid
node scripts/geo/build.mjs

# Validate any file against the pinned source
node scripts/geo/validate.mjs [path/to/file.json]
```

All commands exit with code 1 if any check fails; in that case the final file is not changed.

## What is checked

| Stage | Check |
|---|---|
| Source | SHA-256 and size of each file match the Git LFS pointer of the pinned commit |
| Metadata | `boundaryID`, year, licence (`Public Domain`), origin and number of units match the expected values |
| Identity | 18 provinces; unique ISO codes; Huambo (AO-HUA), Bié (AO-BIE) and Huíla (AO-HUI); names identical to the source; only the `iso` and `nome` properties; ordered by ISO code |
| Topology | closed rings with ≥ 4 points; no self-intersections; no overlaps (sum of areas = area of the union); no new gaps (holes in the union) |
| Fidelity | area deviation ≤ 0.5 % per province; original parts between 5 and 1000 km² have ≥ 90 % of their vertices within 1 km of the simplified geometry |
| Format | RFC 7946 (no `crs`/`bbox`, counter-clockwise exterior rings, clockwise holes); ≤ 4 decimal places |
| Reproducibility (`--check`) | the generated file matches the existing one byte for byte |

## Changing parameters

All parameters are in `config.mjs` (source, mapshaper version, simplification and criteria). Any
change alters the result: build again, review the visual comparison and update `PROVENIENCIA.md`
(parameters, sizes and SHA-256).
