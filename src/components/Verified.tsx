"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fmt } from "@/lib/format";
import { VERIFIED_AT } from "@/lib/site";

export function VCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#1E8BFF" stroke="#fff" strokeWidth="2" />
      <path d="M6.6 8.4a7 7 0 0 1 4.8-3.5" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M7.4 12.4l3 3 6.2-6.4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Check azul de "guay verificado" para quien ha sido el nº 1 al menos 50 veces.
// Con `tip`, al pasar el ratón (o tocarlo en el móvil) explica qué es.
// Con `space`, va pegado a la última palabra del nombre para que nunca se quede solo en otra línea.
export default function Verified({ times, tip = false, space = false }: { times: number; tip?: boolean; space?: boolean }) {
  if (times < VERIFIED_AT) return null;
  const badge = tip ? (
    <VerifiedTip times={times} />
  ) : (
    <span className="verified" role="img" aria-label="Guay verificado" title="Guay verificado">
      <VCheck />
    </span>
  );
  return space ? (
    <span className="vnb">
      {"\u00A0"}
      {badge}
    </span>
  ) : (
    badge
  );
}

// Nombre que se corta con "…" si no cabe, sin esconder el check.
export function VName({ p, extra, className = "" }: { p: { name: string; times: number }; extra?: string; className?: string }) {
  return (
    <span className={"vn " + className}>
      <span className="vt">{p.name}</span>
      <Verified times={p.times} />
      {extra ? <span className="vx">{extra}</span> : null}
    </span>
  );
}

function VerifiedTip({ times }: { times: number }) {
  const btn = useRef<HTMLButtonElement>(null);
  const tipEl = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const b = btn.current;
    const t = tipEl.current;
    if (!b || !t) return;
    const r = b.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    let y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    setPos({ x, y });
  }, [open]);

  // Se cierra tocando en otro sitio o al hacer scroll.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "scroll" || !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close, true);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close, true);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        className="verified"
        type="button"
        aria-label={`Guay verificado: ha sido el más guay del mundo ${times} veces`}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onClick={() => setOpen(true)}
      >
        <VCheck />
      </button>
      {open &&
        createPortal(
          <div ref={tipEl} className="vtip" role="tooltip" style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0 }}>
            <b>
              <VCheck />
              Guay verificado
            </b>
            Ha sido el más guay del mundo {fmt(times)} veces. Esto ya no es suerte.
          </div>,
          document.body,
        )}
    </>
  );
}
