import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_BASE_URL, DEFAULT_API_TIMEOUT_MS } from './api.js';
import { resolveApiBaseUrl, resolveApiTimeoutMs } from './env.js';

describe('resolveApiBaseUrl', () => {
  it('usa a URL documentada quando a variável não está definida ou está vazia', () => {
    expect(resolveApiBaseUrl({})).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '   ' })).toBe(DEFAULT_API_BASE_URL);
    expect(DEFAULT_API_BASE_URL).toBe('https://detetive-da-chuva.onrender.com');
  });

  it('permite substituir a URL e remove barras finais', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: 'http://localhost:8000/' })).toBe(
      'http://localhost:8000',
    );
  });

  it('recusa valores que não são URLs http(s) e avisa na consola', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: 'não-é-url' })).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: 'ftp://x.org' })).toBe(DEFAULT_API_BASE_URL);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('resolveApiTimeoutMs', () => {
  it('usa o valor predefinido quando não está definido', () => {
    expect(resolveApiTimeoutMs({})).toBe(DEFAULT_API_TIMEOUT_MS);
  });

  it('aceita inteiros dentro dos limites', () => {
    expect(resolveApiTimeoutMs({ VITE_API_TIMEOUT_MS: '30000' })).toBe(30000);
  });

  it('recusa valores fora dos limites ou não numéricos', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveApiTimeoutMs({ VITE_API_TIMEOUT_MS: '10' })).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({ VITE_API_TIMEOUT_MS: 'abc' })).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({ VITE_API_TIMEOUT_MS: '999999999' })).toBe(DEFAULT_API_TIMEOUT_MS);
  });
});
