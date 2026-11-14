// Cores dos estados da avaliação, por `tone` (config/status.js). Fonte única: usada pelo
// ResultsArea (cartão do veredito) e pelos componentes de relatório antigos.
//
// Os estados distinguem-se pela forma do ícone (círculo com visto, relógio, triângulo), pelo texto
// e pela cor — nunca só pela cor — e nunca são preenchidos. As cores semânticas (verde, laranja,
// vermelho) são exclusivas dos resultados: os botões usam o gradiente Aurora.
// Contraste (texto sobre Mission Navy / contorno e barra sobre Space Black):
//   favorável     verde #22A06B    5,1:1 / 5,8:1
//   aguardar      laranja #E58A32  6,5:1 / 7,3:1
//   desfavorável  NASA Red         4,7:1 / 5,3:1
//   neutro        texto ink-muted; contorno tracejado Steel Blue (estado ausente ou não reconhecido)

export const STATUS_TONE_STYLES = Object.freeze({
  positive: Object.freeze({
    text: 'text-status-favorable',
    rule: 'border-status-favorable',
    icon: 'text-status-favorable',
    bar: 'bg-status-favorable',
  }),
  caution: Object.freeze({
    text: 'text-status-wait',
    rule: 'border-status-wait',
    icon: 'text-status-wait',
    bar: 'bg-status-wait',
  }),
  warning: Object.freeze({
    text: 'text-status-unfavorable',
    rule: 'border-status-unfavorable',
    icon: 'text-status-unfavorable',
    bar: 'bg-status-unfavorable',
  }),
  neutral: Object.freeze({
    text: 'text-ink-muted',
    rule: 'border-dashed border-line-strong',
    icon: 'text-ink-muted',
    bar: 'bg-line-strong',
  }),
});

export function statusToneStyles(tone) {
  return STATUS_TONE_STYLES[tone] ?? STATUS_TONE_STYLES.neutral;
}
