import { API_PATHS } from '../config/api.js';
import { isPlainObject } from '../utils/validators.js';
import { ApiError, requestJson } from './api.js';

function assertArray(value, path) {
  if (!Array.isArray(value)) {
    throw new ApiError('malformed', 'Era esperada uma lista', { path });
  }
  return value;
}

function assertObject(value, path) {
  if (!isPlainObject(value)) {
    throw new ApiError('malformed', 'Era esperado um objecto', { path });
  }
  return value;
}

/** GET /health — objecto tal como devolvido pela API. */
export async function getHealth(options) {
  return assertObject(await requestJson(API_PATHS.health, options), API_PATHS.health);
}

/** GET /api/v1/provinces — lista tal como devolvida pela API. */
export async function getProvinces(options) {
  return assertArray(await requestJson(API_PATHS.provinces, options), API_PATHS.provinces);
}

/** GET /api/v1/crops — lista tal como devolvida pela API. */
export async function getCrops(options) {
  return assertArray(await requestJson(API_PATHS.crops, options), API_PATHS.crops);
}
