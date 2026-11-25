import { useId } from 'react';

interface SymbolProps {
  className?: string;
}

export function CrossMark({ className = '' }: SymbolProps) {
  const id = `cross-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 240 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="120" y1="0" x2="120" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="118" r="104" stroke={`url(#${id})`} strokeOpacity="0.24" />
      <circle cx="120" cy="118" r="78" stroke={`url(#${id})`} strokeOpacity="0.4" />
      <path
        d="M108 62h24v48h48v24h-48v120h-24V134H60v-24h48V62Z"
        fill={`url(#${id})`}
        fillOpacity="0.92"
      />
      <path d="M16 118h50M174 118h50M120 8v40" stroke={`url(#${id})`} strokeOpacity="0.5" />
    </svg>
  );
}

export function BibleSymbol({ className = '' }: SymbolProps) {
  const id = `bible-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="210" y1="30" x2="210" y2="270" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <path
        d="M210 66c-38-24-82-30-132-18v204c50-12 94-6 132 18 38-24 82-30 132-18V48c-50-12-94-6-132 18Z"
        fill={`url(#${id})`}
        fillOpacity="0.96"
      />
      <path d="M210 66v204" stroke="#1C4ED8" strokeOpacity="0.55" strokeWidth="3" />
      <path d="M96 84c34-5 64 0 88 14M96 116c34-5 64 0 88 14M96 148c34-5 64 0 88 14" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
      <path d="M236 98c24-14 54-19 88-14M236 130c24-14 54-19 88-14M236 162c24-14 54-19 88-14" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
      <path d="M210 218v-44m-16 16h32" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function LightRays({ className = '' }: SymbolProps) {
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="300" cy="300" r="250" stroke="#FBBF24" strokeOpacity="0.12" />
      <circle cx="300" cy="300" r="190" stroke="#FBBF24" strokeOpacity="0.18" />
      <path
        d="M300 20v120M300 460v120M20 300h120M460 300h120M99 99l85 85M416 416l85 85M501 99l-85 85M184 416l-85 85"
        stroke="#FBBF24"
        strokeOpacity="0.26"
        strokeLinecap="round"
        className="landing-symbol-line"
      />
    </svg>
  );
}

export function Ornament({ className = '' }: SymbolProps) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M2 12h36M82 12h36" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 4l6 8-6 8-6-8 6-8Z" fill="#FBBF24" />
    </svg>
  );
}
