// Cores dos estados da avaliação, por `tone` (config/status.js). Contraste sobre Ivory:
// Forest 8,9:1 · Earth 4,9:1 · Charcoal 12,4:1. A paleta não tem vermelho: o estado desfavorável
// distingue-se pelo ícone (triângulo) e pelo texto, nunca só pela cor.
// O filete do estado neutro usa Rain Blue (elemento gráfico, ≥ 3:1).

export const STATUS_TONE_STYLES = Object.freeze({
  positive: { text: 'text-forest', rule: 'border-forest' },
  caution: { text: 'text-earth', rule: 'border-earth' },
  warning: { text: 'text-charcoal', rule: 'border-charcoal' },
  neutral: { text: 'text-charcoal', rule: 'border-rain' },
});

export function statusToneStyles(tone) {
  return STATUS_TONE_STYLES[tone] ?? STATUS_TONE_STYLES.neutral;
}
