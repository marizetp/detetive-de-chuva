import { localizeCropName } from '../i18n/catalogNames.js';

const NAME_TO_ID = Object.freeze({
  milho: 'milho',
  feijão: 'feijao',
  feijao: 'feijao',
  soja: 'soja',
  mandioca: 'mandioca',
  arroz: 'arroz',
});

export function getCropDisplayLabel(cropName, language) {
  if (!cropName) return '';
  const id = NAME_TO_ID[String(cropName).trim().toLowerCase()] ?? String(cropName).trim().toLowerCase();
  return localizeCropName({ id, label: cropName }, language).text;
}
