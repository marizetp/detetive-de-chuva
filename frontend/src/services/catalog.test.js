import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubFetch } from '../test/fetchMock.js';
import { healthResponse, provincesResponse } from '../test/fixtures/liveResponses.js';
import { getCrops, getHealth, getProvinces } from './catalog.js';

const options = { baseUrl: 'https://api.test' };

afterEach(() => vi.unstubAllGlobals());

describe('catalog', () => {
  it('getProvinces devolve a lista da API sem alterações (incluindo campos extra)', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(provincesResponse));
    await expect(getProvinces(options)).resolves.toEqual(provincesResponse);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/provinces');
  });

  it('getCrops chama /api/v1/crops', async () => {
    const fetchMock = stubFetch(async () => jsonResponse([]));
    await expect(getCrops(options)).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/crops');
  });

  it('listas que não são arrays → malformed', async () => {
    stubFetch(async () => jsonResponse({ provincias: [] }));
    await expect(getProvinces(options)).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('getHealth exige um objecto', async () => {
    stubFetch(async () => jsonResponse(healthResponse));
    await expect(getHealth(options)).resolves.toEqual(healthResponse);

    stubFetch(async () => jsonResponse([]));
    await expect(getHealth(options)).rejects.toMatchObject({ kind: 'malformed' });
  });
});
