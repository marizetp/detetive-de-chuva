import { describe, expect, it } from 'vitest';
import { getLocalIsoDate } from './dates.js';

describe('getLocalIsoDate', () => {
  it('usa a data local, com zeros à esquerda', () => {
    expect(getLocalIsoDate(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('não desliza para o dia seguinte perto da meia-noite (ao contrário de toISOString em UTC)', () => {
    expect(getLocalIsoDate(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
    expect(getLocalIsoDate(new Date(2026, 10, 12, 0, 1))).toBe('2026-11-12');
  });
});
