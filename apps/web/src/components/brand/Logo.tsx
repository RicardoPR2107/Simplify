import { useId } from 'react';

/**
 * - `light`: sobre fondos claros.
 * - `dark`: sobre fondos oscuros (modo oscuro).
 * - `onGreen`: sobre el verde de la marca (menú lateral, ícono de app).
 */
type LogoVariant = 'light' | 'dark' | 'onGreen';

interface LogoColors {
  ink: string;
  body: string;
  band: string;
  tab: string;
  clasp: string;
  bill: string;
  bill2: string;
  /** Color del fondo: recorta la S sobre la billetera. Admite variables CSS. */
  halo: string;
}

const PALETTES: Record<LogoVariant, LogoColors> = {
  light: {
    ink: '#134A33',
    body: '#3E7B60',
    band: '#2E6B52',
    tab: '#134A33',
    clasp: '#E7F2CC',
    bill: '#E7F2CC',
    bill2: '#B8D86B',
    halo: 'var(--card)',
  },
  dark: {
    ink: '#E6EEE8',
    body: '#B8D86B',
    band: '#93B94F',
    tab: '#E7F2CC',
    clasp: '#0C2A1D',
    bill: '#E7F2CC',
    bill2: '#B8D86B',
    halo: 'var(--card)',
  },
  onGreen: {
    ink: '#FFFFFF',
    body: '#B8D86B',
    band: '#93B94F',
    tab: '#E7F2CC',
    clasp: '#134A33',
    bill: '#FFFFFF',
    bill2: '#DDEBB8',
    halo: 'var(--sidebar)',
  },
};

const S_PATH = 'M 82 28 C 74 18, 44 16, 40 34 C 37 50, 82 52, 82 74 C 82 98, 48 102, 36 90';

interface LogomarkProps {
  size?: number;
  variant?: LogoVariant;
  /** Si el logo va junto al nombre "Simplify", es decorativo para lectores de pantalla. */
  decorative?: boolean;
}

/** Símbolo de Simplify: S inclinada con una billetera que sale de su base hacia arriba a la izquierda. */
export function Logomark({ size = 40, variant = 'light', decorative = false }: LogomarkProps) {
  const c = PALETTES[variant];
  const titleId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      className="shrink-0"
    >
      {!decorative && <title id={titleId}>Simplify</title>}
      <g transform="translate(60 60) scale(0.9) translate(-60 -60)">
        <g transform="rotate(-24 39 67)">
          <rect x="19" y="41" width="38" height="20" rx="2.5" fill={c.bill} />
          <circle cx="38" cy="48" r="4" fill="none" stroke={c.body} strokeWidth="1.6" />
          <rect x="15" y="46" width="38" height="18" rx="2.5" fill={c.bill2} />
          <rect x="11" y="50" width="56" height="34" rx="8" fill={c.body} />
          <rect x="11" y="50" width="56" height="7" rx="3.5" fill={c.band} />
          <path d="M 11 62 H 29 A 7 7 0 0 1 29 76 H 11 Z" fill={c.tab} />
          <circle cx="25" cy="69" r="2.4" fill={c.clasp} />
        </g>
        <g transform="translate(28 0) skewX(-12)" fill="none" strokeLinecap="round">
          {/* El color va en `style` para poder usar variables CSS del tema. */}
          <path d={S_PATH} strokeWidth="28" style={{ stroke: c.halo }} />
          <path d={S_PATH} strokeWidth="18" style={{ stroke: c.ink }} />
        </g>
      </g>
    </svg>
  );
}

/** Logo horizontal: símbolo + nombre. */
export function BrandLogo({
  variant = 'light',
  hideName = false,
}: {
  variant?: LogoVariant;
  /** Oculta el nombre a la vista (menú contraído) sin quitárselo a los lectores de pantalla. */
  hideName?: boolean;
}) {
  const nameColor = variant === 'onGreen' ? 'text-sidebar-text' : 'text-ink';
  return (
    <span className="flex items-center gap-1.5">
      <Logomark size={40} variant={variant} decorative />
      <span
        className={`text-xl font-bold tracking-tight ${nameColor} ${hideName ? 'sr-only' : ''}`}
      >
        Simplify
      </span>
    </span>
  );
}
