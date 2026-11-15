// Ícones SVG em linha, decorativos (aria-hidden): o significado é sempre dado pelo texto ao lado.

function SvgIcon({ className = 'size-5', children, viewBox = '0 0 24 24' }) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ArrowIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </SvgIcon>
  );
}

export function MenuIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </SvgIcon>
  );
}

export function ChevronDownIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M6 9l6 6 6-6" />
    </SvgIcon>
  );
}

export function RetryIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7" />
    </SvgIcon>
  );
}

export function CloseIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </SvgIcon>
  );
}

// Ícones dos indicadores e da recomendação (substituem emoji, cuja cor dependia do sistema).

/** Chuva acumulada recente: nuvem com chuva. */
export function RainIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M7.5 14.5h9a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 7.4 7.2a3.65 3.65 0 0 0 .1 7.3z" />
      <path d="M9 17.5l-1 2.5M12.5 17.5l-1 2.5M16 17.5l-1 2.5" />
    </SvgIcon>
  );
}

/** Humidade do solo: gota (mesma forma da gota da marca). */
export function DropletIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3.5c-3.3 4.2-5.6 7.3-5.6 10a5.6 5.6 0 0 0 11.2 0c0-2.7-2.3-5.8-5.6-10z" />
    </SvgIcon>
  );
}

/** Chuva prevista para os próximos dias: calendário com gota. */
export function ForecastIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M5 6.5h14v13H5zM5 10h14M9 4.5v4M15 4.5v4" />
      <path d="M12 12.3c-1.2 1.5-2 2.6-2 3.5a2 2 0 0 0 4 0c0-.9-.8-2-2-3.5z" />
    </SvgIcon>
  );
}

/** Recomendação para o terreno: plântula (como as da ilustração). */
export function SproutIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 20v-8.5M7 20h10" />
      <path d="M12 14c0-3 2-5.2 5.8-5.6-.1 3.4-2.4 5.6-5.8 5.6zM12 11.5c0-2.6-1.8-4.4-5.3-4.6.1 2.9 2 4.6 5.3 4.6z" />
    </SvgIcon>
  );
}

/** Ícones dos estados da avaliação, por `tone` (config/status.js). Formas distintas, não só cor. */
export function StatusIcon({ tone, ...props }) {
  switch (tone) {
    case 'positive':
      return (
        <SvgIcon {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.7 2.7L16 9.8" />
        </SvgIcon>
      );
    case 'caution':
      return (
        <SvgIcon {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </SvgIcon>
      );
    case 'warning':
      return (
        <SvgIcon {...props}>
          <path d="M12 3.5L21.5 20h-19L12 3.5z" />
          <path d="M12 10v4.5M12 17.4v.1" />
        </SvgIcon>
      );
    case 'neutral-info':
      return (
        <SvgIcon {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.5M12 7.6v.1" />
        </SvgIcon>
      );
    default:
      return (
        <SvgIcon {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.9v.1" />
        </SvgIcon>
      );
  }
}
