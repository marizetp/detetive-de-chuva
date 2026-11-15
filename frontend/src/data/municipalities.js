/**
 * Agricultural municipalities per Central Plateau pilot province
 * (matching geoBoundaries Angola ADM2 geometries).
 */

export const MUNICIPALITIES_BY_PROVINCE = {
  Huambo: [
    { id: 'huambo-huambo', label: 'Huambo', value: 'Huambo', isSeat: true },
    { id: 'huambo-bailundo', label: 'Bailundo', value: 'Bailundo' },
    { id: 'huambo-caala', label: 'Caála', value: 'Caála' },
    { id: 'huambo-catchiungo', label: 'Catchiungo', value: 'Catchiungo' },
    { id: 'huambo-ekunha', label: 'Ekunha', value: 'Ekunha' },
    { id: 'huambo-longonjo', label: 'Longonjo', value: 'Longonjo' },
    { id: 'huambo-londuimbale', label: 'Londuimbale', value: 'Londuimbale' },
    { id: 'huambo-mungo', label: 'Mungo', value: 'Mungo' },
    { id: 'huambo-chicala-cholohanga', label: 'Chicala-Cholohanga', value: 'Chicala-Cholohanga' },
    { id: 'huambo-tchinjenje', label: 'Tchinjenje', value: 'Tchinjenje' },
    { id: 'huambo-ukuma', label: 'Ukuma', value: 'Ukuma' },
  ],
  Bié: [
    { id: 'bie-kuito', label: 'Kuito', value: 'Kuito', isSeat: true },
    { id: 'bie-andulo', label: 'Andulo', value: 'Andulo' },
    { id: 'bie-camacupa', label: 'Camacupa', value: 'Camacupa' },
    { id: 'bie-catabola', label: 'Catabola', value: 'Catabola' },
    { id: 'bie-chinguar', label: 'Chinguar', value: 'Chinguar' },
    { id: 'bie-chitembo', label: 'Chitembo', value: 'Chitembo' },
    { id: 'bie-cuemba', label: 'Cuemba', value: 'Cuemba' },
    { id: 'bie-cunhinga', label: 'Cunhinga', value: 'Cunhinga' },
    { id: 'bie-nharea', label: "N'harea", value: "N'harea" },
  ],
  Huíla: [
    { id: 'huila-lubango', label: 'Lubango', value: 'Lubango', isSeat: true },
    { id: 'huila-caconda', label: 'Caconda', value: 'Caconda' },
    { id: 'huila-caluquembe', label: 'Caluquembe', value: 'Caluquembe' },
    { id: 'huila-chibia', label: 'Chibia', value: 'Chibia' },
    { id: 'huila-chicomba', label: 'Chicomba', value: 'Chicomba' },
    { id: 'huila-chipindo', label: 'Chipindo', value: 'Chipindo' },
    { id: 'huila-cuvango', label: 'Cuvango', value: 'Cuvango' },
    { id: 'huila-gambos', label: 'Gambos (Chiange)', value: 'Gambos (Chiange)' },
    { id: 'huila-humpata', label: 'Humpata', value: 'Humpata' },
    { id: 'huila-jamba', label: 'Jamba', value: 'Jamba' },
    { id: 'huila-matala', label: 'Matala', value: 'Matala' },
    { id: 'huila-quilengues', label: 'Quilengues', value: 'Quilengues' },
    { id: 'huila-quipungo', label: 'Quipungo', value: 'Quipungo' },
  ],
};

const GEO_MUNICIPALITY_ALIASES = Object.freeze({
  caala: 'Caála',
  'ecunha (ekunha)': 'Ekunha',
  'tchikala-tcholohanga': 'Chicala-Cholohanga',
  cuito: 'Kuito',
  'gambos(chiange)': 'Gambos (Chiange)',
});

/** Normalizes a GeoJSON ADM2 `nome` to the canonical municipality name accepted by the API. */
export function canonicalMunicipalityName(geoName) {
  if (!geoName) return '';
  const key = String(geoName).trim().toLowerCase();
  return GEO_MUNICIPALITY_ALIASES[key] ?? String(geoName).trim();
}
