/**
 * Catálogo de municípios agrícolas do Planalto Central de Angola suportados pela API v2.0.
 * Nomes próprios: iguais em todos os idiomas. `isSeat` marca a sede municipal da capital
 * provincial; a indicação «(Sede)» é acrescentada pela interface, no idioma activo.
 */
export const MUNICIPALITIES_BY_PROVINCE = {
  Huambo: [
    { id: 'caala', label: 'Caála', value: 'Caála' },
    { id: 'bailundo', label: 'Bailundo', value: 'Bailundo' },
    { id: 'chicala-cholohanga', label: 'Chicala-Cholohanga', value: 'Chicala-Cholohanga' },
    { id: 'longonjo', label: 'Longonjo', value: 'Longonjo' },
    { id: 'ukuma', label: 'Ukuma', value: 'Ukuma' },
    { id: 'ekunha', label: 'Ekunha', value: 'Ekunha' },
    { id: 'huambo', label: 'Huambo', value: 'Huambo', isSeat: true },
  ],
  Bié: [
    { id: 'kuito', label: 'Kuito', value: 'Kuito', isSeat: true },
    { id: 'camacupa', label: 'Camacupa', value: 'Camacupa' },
    { id: 'catabola', label: 'Catabola', value: 'Catabola' },
    { id: 'chinguar', label: 'Chinguar', value: 'Chinguar' },
    { id: 'andulo', label: 'Andulo', value: 'Andulo' },
    { id: 'chitembo', label: 'Chitembo', value: 'Chitembo' },
  ],
  Huíla: [
    { id: 'lubango', label: 'Lubango', value: 'Lubango', isSeat: true },
    { id: 'matala', label: 'Matala', value: 'Matala' },
    { id: 'caconda', label: 'Caconda', value: 'Caconda' },
    { id: 'chibia', label: 'Chibia', value: 'Chibia' },
    { id: 'caluquembe', label: 'Caluquembe', value: 'Caluquembe' },
    { id: 'quilengues', label: 'Quilengues', value: 'Quilengues' },
  ],
};
