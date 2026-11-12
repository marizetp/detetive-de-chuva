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
