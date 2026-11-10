import type { CSSProperties } from "react";
import { initials, linkKind, linkText, type LinkKind } from "@/lib/validation";

export type AvatarLook = { name: string; photo?: string | null; emoji?: string | null; hue?: number };

// Foto, emoji sobre color o iniciales sobre color.
export function Avatar({ p, size = "" }: { p: AvatarLook; size?: "" | "sm" | "md" | "lg" | "xl" }) {
  const cls = "av" + (size ? " " + size : "");
  if (p.photo) {
    return (
      <span className={cls}>
        <img src={p.photo} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  const style = { "--h": p.hue ?? 250 } as CSSProperties;
  if (p.emoji) {
    return (
      <span className={cls} style={style}>
        <span className="emo">{p.emoji}</span>
      </span>
    );
  }
  return (
    <span className={cls} style={style}>
      {initials(p.name)}
    </span>
  );
}

const LINK_KINDS: Record<LinkKind, { label: string; svg: React.ReactNode }> = {
  ig: {
    label: "mi Instagram",
    svg: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  yt: {
    label: "mi canal",
    svg: (
      <>
        <path d="M9.5 8.3v7.4l6.4-3.7z" fill="currentColor" stroke="none" />
        <rect x="2.5" y="5" width="19" height="14" rx="4.5" />
      </>
    ),
  },
  tt: {
    label: "mi TikTok",
    svg: (
      <>
        <path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8" />
        <path d="M14 3.5c.6 2.6 2.5 4.3 5.2 4.5" />
      </>
    ),
  },
  fb: {
    label: "mi Facebook",
    svg: (
      <>
        <path d="M15.2 7.2h-1.7a2.5 2.5 0 0 0-2.5 2.5V20.5" />
        <path d="M8.4 12.6h6.4" />
      </>
    ),
  },
  web: {
    label: "mi web",
    svg: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9s1.2-6.4 3.8-9z" />
      </>
    ),
  },
};

// Contenido del botón grande del enlace del nº 1: icono de la red, "Quiero que veas…", @usuario y "Ver".
export function LinkInner({ url }: { url: string }) {
  const k = linkKind(url);
  const d = LINK_KINDS[k];
  return (
    <>
      <span className={"lk-ic " + k}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {d.svg}
        </svg>
      </span>
      <span className="lk-txt">
        <small>👀 Quiero que veas {d.label}</small>
        <b>{linkText(url, k)}</b>
      </span>
      <span className="lk-go">
        Ver <i>↗</i>
      </span>
    </>
  );
}
