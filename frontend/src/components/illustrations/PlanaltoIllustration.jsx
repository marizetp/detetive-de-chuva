// Ilustração do Planalto Central: nuvem de chuva sobre colinas, uma árvore e campos lavrados
// com plântulas. Apenas ilustrativa — não representa dados. Desenhada só com a paleta do projecto.

const C = {
  forest: 'var(--color-forest)',
  ivory: 'var(--color-ivory)',
  earth: 'var(--color-earth)',
  rain: 'var(--color-rain)',
  sage: 'var(--color-sage)',
  charcoal: 'var(--color-charcoal)',
};

/** Arco de janela: semicírculo no topo, base recta. */
const ARCH_PATH = 'M0 240 A240 240 0 0 1 480 240 V560 H0 Z';

/** [x inicial, y inicial, comprimento] de cada traço de chuva (inclinação constante). */
const RAIN_STREAKS = [
  [138, 184, 42],
  [160, 204, 26],
  [184, 186, 54],
  [207, 210, 30],
  [231, 188, 46],
  [254, 206, 24],
  [278, 186, 52],
  [301, 204, 34],
  [325, 190, 40],
  [348, 182, 22],
];
const RAIN_SLANT = 0.28;

/** Sulcos do campo: curvas paralelas que acompanham o relevo. */
const FURROWS = Array.from({ length: 6 }, (_, i) => {
  const y = 446 + i * 20;
  return `M0 ${y} C120 ${y - 26 + i * 2} 300 ${y - 20 + i * 2} 480 ${y + 8 + i * 2}`;
});

/** Plântulas ao longo do segundo sulco. */
const SPROUTS = [
  [56, 459],
  [112, 453],
  [168, 450],
  [224, 449],
  [280, 451],
  [336, 455],
  [392, 461],
  [446, 468],
];

/** Escala de medição (marcas sem valores: evoca um pluviómetro, não mostra dados). */
const SCALE_TICKS = Array.from({ length: 11 }, (_, i) => 196 + i * 10);

export default function PlanaltoIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 560"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="planalto-arch">
          <path d={ARCH_PATH} />
        </clipPath>
      </defs>

      <g clipPath="url(#planalto-arch)">
        {/* Céu */}
        <rect width="480" height="560" fill={C.sage} />

        {/* Linhas de nível subtis: referência topográfica */}
        <g fill="none" stroke={C.forest} strokeOpacity="0.09" strokeWidth="1.2">
          <path d="M-20 70 C80 40 200 52 300 34 S440 20 520 40" />
          <path d="M-20 96 C90 70 210 82 310 64 S450 52 520 70" />
          <path d="M-20 260 C60 236 150 246 240 232 S400 218 520 236" />
        </g>

        {/* Nuvem de chuva */}
        <g fill={C.forest}>
          <circle cx="172" cy="132" r="44" />
          <circle cx="232" cy="110" r="58" />
          <circle cx="294" cy="128" r="46" />
          <circle cx="338" cy="148" r="30" />
          <rect x="128" y="132" width="230" height="40" rx="20" />
        </g>

        {/* Chuva */}
        <g stroke={C.rain} strokeWidth="3.2" strokeLinecap="round">
          {RAIN_STREAKS.map(([x, y, length]) => (
            <line key={`${x}-${y}`} x1={x} y1={y} x2={x - length * RAIN_SLANT} y2={y + length} />
          ))}
        </g>

        {/* Escala de medição */}
        <g stroke={C.charcoal} strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round">
          <line x1="452" y1="196" x2="452" y2="296" />
          {SCALE_TICKS.map((y, i) => (
            <line key={y} x1={i % 5 === 0 ? 436 : 443} y1={y} x2="452" y2={y} />
          ))}
        </g>

        {/* Colinas ao longe e a meia distância */}
        <path
          d="M0 318 C70 296 140 288 214 300 C290 312 360 286 480 296 V560 H0 Z"
          fill={C.forest}
          fillOpacity="0.2"
        />
        <path
          d="M0 372 C88 344 176 338 262 356 C340 372 410 352 480 344 V560 H0 Z"
          fill={C.forest}
          fillOpacity="0.55"
        />

        {/* Árvore de copa larga */}
        <g fill={C.forest}>
          <rect x="381" y="322" width="5" height="34" rx="2" />
          <ellipse cx="384" cy="318" rx="34" ry="11" />
          <ellipse cx="370" cy="326" rx="18" ry="6" />
        </g>

        {/* Campo lavrado */}
        <path d="M0 424 C120 398 300 404 480 432 V560 H0 Z" fill={C.earth} />
        <g fill="none" stroke={C.ivory} strokeOpacity="0.3" strokeWidth="1.6">
          {FURROWS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {/* Plântulas */}
        <g fill="none" stroke={C.sage} strokeWidth="2.4" strokeLinecap="round">
          {SPROUTS.map(([x, y]) => (
            <g key={x}>
              <path d={`M${x} ${y} V${y - 18}`} />
              <path d={`M${x} ${y - 9} q7 -2 10 -10`} />
              <path d={`M${x} ${y - 14} q-7 -1 -9 -8`} />
            </g>
          ))}
        </g>
      </g>

      {/* Contorno do arco */}
      <path d={ARCH_PATH} fill="none" stroke={C.forest} strokeOpacity="0.25" strokeWidth="1.5" />
    </svg>
  );
}
