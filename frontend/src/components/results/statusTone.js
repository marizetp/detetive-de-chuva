// Cores dos estados da avaliação, por `tone` (config/status.js). Contraste sobre Space Black:
// Telemetry Cyan 6,8:1 · Orbital White 16,9:1 · NASA Red 5,3:1. Os estados distinguem-se também
// pela forma do ícone (círculo com visto, relógio, triângulo) e pelo texto, nunca só pela cor.
// O estado «aguardar» usa texto Orbital White com filete Steel Blue (4,6:1, elemento gráfico),
// para não ser confundido com um aviso; o estado desconhecido usa um filete tracejado.

export const STATUS_TONE_STYLES = Object.freeze({
  positive: { text: 'text-accent', rule: 'border-accent' },
  caution: { text: 'text-ink', rule: 'border-caution' },
  warning: { text: 'text-danger', rule: 'border-danger' },
  neutral: { text: 'text-ink-muted', rule: 'border-dashed border-line-strong' },
});

export function statusToneStyles(tone) {
  return STATUS_TONE_STYLES[tone] ?? STATUS_TONE_STYLES.neutral;
}
