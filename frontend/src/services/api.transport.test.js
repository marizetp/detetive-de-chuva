import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, requestJson, resetTransport, setTransport } from './api.js';

// Ponto de injecção da rede: em produção é sempre `fetch`; só o modo de demonstração o substitui.

const okResponse = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

afterEach(() => {
  resetTransport();
  vi.unstubAllGlobals();
});

describe('transporte de rede', () => {
  it('por omissão usa fetch', async () => {
    const fetchSpy = vi.fn(async () => okResponse({ via: 'fetch' }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(requestJson('/health', { baseUrl: 'https://api.test' })).resolves.toEqual({ via: 'fetch' });
    expect(fetchSpy).toHaveBeenCalledWith('https://api.test/health', expect.objectContaining({ method: 'GET' }));
  });

  it('com um transporte instalado, fetch nunca é chamado', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const transport = vi.fn(async () => okResponse({ via: 'transporte' }));
    setTransport(transport);
    await expect(requestJson('/health')).resolves.toEqual({ via: 'transporte' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resetTransport repõe fetch', async () => {
    const fetchSpy = vi.fn(async () => okResponse({ via: 'fetch' }));
    vi.stubGlobal('fetch', fetchSpy);
    setTransport(async () => okResponse({ via: 'transporte' }));
    resetTransport();
    await expect(requestJson('/health')).resolves.toEqual({ via: 'fetch' });
  });

  it('um ApiError do transporte passa sem ser reclassificado como falha de rede', async () => {
    setTransport(async () => {
      throw new ApiError('demoUnavailable', 'sem gravação', { path: '/x' });
    });
    await expect(requestJson('/x')).rejects.toMatchObject({ kind: 'demoUnavailable' });
  });

  it('outros erros do transporte continuam a ser falhas de rede', async () => {
    setTransport(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(requestJson('/x')).rejects.toMatchObject({ kind: 'network' });
  });
});
