// Utilitários determinísticos de projecção geográfica para desenho SVG dos mapas de Angola
// (ADM1 18 províncias) e dos municípios do Planalto Central (ADM2).

const ANGOLA_COS_LAT = Math.cos((-11.2 * Math.PI) / 180);

function visitCoordinates(geometry, cb) {
  if (!geometry) return;
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      for (const pt of ring) cb(pt[0], pt[1]);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        for (const pt of ring) cb(pt[0], pt[1]);
      }
    }
  }
}

export function computeBoundingBox(features) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    visitCoordinates(feature?.geometry, (lon, lat) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  }

  return { minLon, maxLon, minLat, maxLat };
}

export function createSvgProjector(bounds, { width = 560, height = 560, padding = 20 } = {}) {
  const spanLon = Math.max((bounds.maxLon - bounds.minLon) * ANGOLA_COS_LAT, 0.01);
  const spanLat = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / spanLon, innerH / spanLat);
  const drawW = spanLon * scale;
  const drawH = spanLat * scale;
  const offsetX = padding + (innerW - drawW) / 2;
  const offsetY = padding + (innerH - drawH) / 2;

  const project = ([lon, lat]) => {
    const x = offsetX + (lon - bounds.minLon) * ANGOLA_COS_LAT * scale;
    const y = offsetY + (bounds.maxLat - lat) * scale;
    return [x, y];
  };

  const toPath = (geometry) => {
    if (!geometry) return '';
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    const parts = [];
    for (const rings of polys) {
      for (const ring of rings) {
        if (!ring || ring.length < 2) continue;
        const cmds = ring.map((pt, idx) => {
          const [x, y] = project(pt);
          return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        });
        parts.push(`${cmds.join(' ')} Z`);
      }
    }
    return parts.join(' ');
  };

  const centroid = (geometry) => {
    if (!geometry) return [width / 2, height / 2];
    const outer =
      geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.coordinates.reduce((best, poly) => (poly[0].length > best.length ? poly[0] : best), []);
    if (!outer || outer.length === 0) return [width / 2, height / 2];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of outer) {
      const [x, y] = project(pt);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  };

  return { project, toPath, centroid, width, height };
}
