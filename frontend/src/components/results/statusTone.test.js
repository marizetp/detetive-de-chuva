import { describe, expect, it } from 'vitest';
import { STATUS_DEFINITIONS, UNKNOWN_STATUS, MISSING_STATUS } from '../../config/status.js';
import { STATUS_TONE_STYLES, statusToneStyles } from './statusTone.js';

describe('statusTone — cores semânticas dos resultados', () => {
  it('cada estado documentado usa o seu token em texto, ícone, contorno e barra', () => {
    const expected = { FAVORAVEL: 'status-favorable', AGUARDAR: 'status-wait', DESFAVORAVEL: 'status-unfavorable' };
    for (const [code, token] of Object.entries(expected)) {
      const styles = statusToneStyles(STATUS_DEFINITIONS[code].tone);
      expect(styles).toEqual({
        text: `text-${token}`,
        rule: `border-${token}`,
        icon: `text-${token}`,
        bar: `bg-${token}`,
      });
    }
  });

  it('estado ausente e não reconhecido: apresentação neutra (tracejado, ink-muted)', () => {
    for (const status of [UNKNOWN_STATUS, MISSING_STATUS]) {
      const styles = statusToneStyles(status.tone);
      expect(styles.rule).toBe('border-dashed border-line-strong');
      expect(styles.text).toBe('text-ink-muted');
    }
  });

  it('tom desconhecido cai no neutro, nunca num estado de negócio', () => {
    expect(statusToneStyles('inexistente')).toBe(STATUS_TONE_STYLES.neutral);
    expect(statusToneStyles(undefined)).toBe(STATUS_TONE_STYLES.neutral);
  });

  it('as cores dos estados não são as dos botões (gradiente de acção)', () => {
    const all = Object.values(STATUS_TONE_STYLES).flatMap((styles) => Object.values(styles)).join(' ');
    expect(all).not.toMatch(/action|aurora|interactive/);
  });
});
