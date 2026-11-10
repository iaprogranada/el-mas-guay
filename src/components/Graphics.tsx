import { useId } from "react";

// Ids únicos para los degradados de los SVG (React puede meter signos raros en useId).
function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function Crown() {
  const g = useSvgId("cg");
  return (
    <svg className="crown" viewBox="0 0 64 46" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF0BF" />
          <stop offset=".45" stopColor="#F4C752" />
          <stop offset="1" stopColor="#C98E14" />
        </linearGradient>
      </defs>
      <path d="M5 15 L19 27 L32 6 L45 27 L59 15 L53 41 H11 Z" fill={`url(#${g})`} stroke="#6B4A00" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="6" r="4.5" fill="#FF3D7F" stroke="#6B4A00" strokeWidth="2" />
      <circle cx="5" cy="15" r="3.6" fill={`url(#${g})`} stroke="#6B4A00" strokeWidth="2" />
      <circle cx="59" cy="15" r="3.6" fill={`url(#${g})`} stroke="#6B4A00" strokeWidth="2" />
      <path d="M13 34 H51" stroke="#6B4A00" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function MiniCrown() {
  return (
    <svg viewBox="0 0 64 46" aria-hidden="true">
      <path d="M5 15 L19 27 L32 6 L45 27 L59 15 L53 41 H11 Z" fill="#E0A92E" stroke="#6B4A00" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function Medal({ tier }: { tier: 2 | 3 }) {
  const g = useSvgId("md");
  const silver = tier === 2;
  const c = silver ? ["#FFFFFF", "#D7DCE5", "#98A1B1", "#5E6778"] : ["#FBE0C4", "#E0A877", "#B0703F", "#6E3D1A"];
  const rb = silver ? ["#4F63FF", "#2F3FD0"] : ["#E2465F", "#A9273F"];
  return (
    <svg className="medalsvg" viewBox="0 0 48 66" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c[0]} />
          <stop offset=".45" stopColor={c[1]} />
          <stop offset="1" stopColor={c[2]} />
        </linearGradient>
      </defs>
      <path d="M5 0h13l10 34H15z" fill={rb[0]} />
      <path d="M30 0h13L33 34H20z" fill={rb[1]} />
      <path d="M9 0h3l9 30h-3z" fill="#fff" opacity=".35" />
      <path d="M37 0h3l-8 28h-3z" fill="#fff" opacity=".25" />
      <circle cx="24" cy="46" r="17" fill={`url(#${g})`} stroke={c[3]} strokeWidth="2" />
      <circle cx="24" cy="46" r="12.5" fill="none" stroke={c[3]} strokeOpacity=".45" strokeWidth="1.5" />
      <path d="M14 38a12 12 0 0 1 9-5" stroke="#fff" strokeOpacity=".8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="24" y="52" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="17" fill={c[3]}>
        {tier}
      </text>
    </svg>
  );
}

export function Logo() {
  const g = useSvgId("lg");
  return (
    <svg viewBox="0 0 64 26" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3266" />
          <stop offset="1" stopColor="#16122E" />
        </linearGradient>
      </defs>
      <path d="M2 5h60" stroke="#16122E" strokeWidth="4" strokeLinecap="round" />
      <path d="M5 5h22v7a11 11 0 0 1-22 0z" fill={`url(#${g})`} />
      <path d="M37 5h22v7a11 11 0 0 1-22 0z" fill={`url(#${g})`} />
      <path d="M10 9h6" stroke="#F4C752" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 9h6" stroke="#F4C752" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
