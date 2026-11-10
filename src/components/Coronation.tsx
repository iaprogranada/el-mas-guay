"use client";

import { useEffect, useRef, useState } from "react";
import { makeStory, type StoryPerson } from "@/lib/story";
import { Avatar } from "./Avatar";
import { Crown } from "./Graphics";

const SHARE_TEXT = "Ahora mismo soy el más guay del mundo 😎 ¿Te atreves a quitarme el puesto? elmasguay.com";
const SHARE_URL = "https://elmasguay.com";

function Ic({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const TARGETS: { k: "wa" | "ig" | "tt" | "fb" | "x" | "cp"; label: string; icon: React.ReactNode }[] = [
  {
    k: "wa",
    label: "WhatsApp",
    icon: (
      <Ic>
        <path d="M3.6 20.4l1.3-4A8.6 8.6 0 1 1 8 19.2z" />
        <path d="M9 8.3c.2 3.4 3.3 6.4 6.7 6.7l.9-1.7-2.1-1.1-.9.8a4.6 4.6 0 0 1-2.6-2.6l.8-.9-1.1-2.1z" fill="currentColor" strokeWidth="1" />
      </Ic>
    ),
  },
  {
    k: "ig",
    label: "Instagram",
    icon: (
      <Ic>
        <rect x="3" y="3" width="18" height="18" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </Ic>
    ),
  },
  {
    k: "tt",
    label: "TikTok",
    icon: (
      <Ic>
        <path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8" />
        <path d="M14 3.5c.6 2.6 2.5 4.3 5.2 4.5" />
      </Ic>
    ),
  },
  {
    k: "fb",
    label: "Facebook",
    icon: (
      <Ic>
        <path d="M15.2 7.2h-1.7a2.5 2.5 0 0 0-2.5 2.5V20.5" />
        <path d="M8.4 12.6h6.4" />
      </Ic>
    ),
  },
  {
    k: "x",
    label: "X",
    icon: (
      <Ic>
        <path d="M4.5 4h4.3l10.7 16h-4.3z" fill="currentColor" stroke="none" />
        <path d="M19 4l-5.8 6.6M10.8 13.4L5 20" />
      </Ic>
    ),
  },
  {
    k: "cp",
    label: "Copiar",
    icon: (
      <Ic>
        <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
        <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
      </Ic>
    ),
  },
];

async function copyText(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(SHARE_TEXT);
    return true;
  } catch {
    return false;
  }
}

// Pantalla de "Ahora mismo eres el más guay del mundo": fondo dorado, confeti y compartir.
export default function Coronation({ person, onClose }: { person: StoryPerson; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const story = useRef<{ blob: Blob | null; file: File | null }>({ blob: null, file: null });
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");

  // La imagen para historias se prepara al abrir, para que al tocar "Instagram" el móvil la comparta al instante.
  useEffect(() => {
    let alive = true;
    makeStory(person)
      .then((blob) => {
        if (!alive || !blob) return;
        story.current = { blob, file: new File([blob], "soy-el-mas-guay.png", { type: "image/png" }) };
      })
      .catch((e) => console.error("No se pudo preparar la imagen para compartir", e));
    return () => {
      alive = false;
    };
  }, [person]);

  // Confeti
  useEffect(() => {
    card.current?.focus();
    const cv = canvas.current;
    if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = (cv.width = innerWidth * dpr);
    const H = (cv.height = innerHeight * dpr);
    const cols = ["#FFFFFF", "#FFF0BF", "#8A5F00", "#FF3D7F", "#5B4BFF", "#16122E", "#F4C752"];
    const ps = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: -Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 5,
      s: (6 + Math.random() * 8) * dpr,
      a: Math.random() * 6,
      va: (Math.random() - 0.5) * 0.3,
      c: cols[Math.floor(Math.random() * cols.length)],
    }));
    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy * dpr;
        p.a += p.va;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (t - t0 < 4500) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function shareImage(app: string) {
    const { blob, file } = story.current;
    if (file && navigator.canShare?.({ files: [file] })) {
      // Primero se comparte (tiene que ir pegado al toque) y luego se copia la frase.
      navigator.share({ files: [file], text: SHARE_TEXT }).catch(() => undefined);
      const ok = await copyText();
      setHint(`Elige ${app} en la lista.${ok ? " La frase ya está copiada por si quieres pegarla." : ""}`);
      return;
    }
    if (!blob) {
      setHint("Un segundo, estamos preparando tu imagen…");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "soy-el-mas-guay.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    const ok = await copyText();
    setHint(`Te hemos descargado la imagen. Súbela a ${app}${ok ? " y pega la frase, que ya está copiada." : "."}`);
  }

  async function share(k: (typeof TARGETS)[number]["k"]) {
    const t = encodeURIComponent(SHARE_TEXT);
    if (k === "wa") window.open("https://wa.me/?text=" + t, "_blank", "noopener");
    else if (k === "fb") window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(SHARE_URL), "_blank", "noopener");
    else if (k === "x") window.open("https://x.com/intent/tweet?text=" + t, "_blank", "noopener");
    else if (k === "ig") await shareImage("Instagram");
    else if (k === "tt") await shareImage("TikTok");
    else setHint((await copyText()) ? "Copiado. Pégalo donde quieras." : SHARE_TEXT);
  }

  return (
    <div className="coronation" role="dialog" aria-modal="true" aria-labelledby="cor-title">
      <div className="rays" aria-hidden="true" />
      <div className="wall" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <div className="inner" ref={card} tabIndex={-1}>
        <div className="kphoto">
          <Crown />
          <Avatar p={person} size="xl" />
        </div>
        <h3 id="cor-title">
          Ahora mismo eres <span className="goldtxt">el más guay del mundo</span>
        </h3>
        <p>Disfrútalo. Puede durar 10 segundos o un día entero.</p>
        <div className="actions">
          <button
            className="sharebtn"
            type="button"
            aria-expanded={open}
            aria-controls="sharegrid"
            onClick={() => {
              setOpen(!open);
              setHint("");
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 15V3" />
              <path d="M7 8l5-5 5 5" />
              <path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" />
            </svg>
            Compartir
          </button>
          <button className="ghost" type="button" onClick={onClose}>
            Volver al ranking
          </button>
        </div>
        <div className="sharegrid" id="sharegrid" hidden={!open}>
          {TARGETS.map((t) => (
            <button key={t.k} type="button" onClick={() => share(t.k)}>
              <span className={"si " + t.k}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <p className="sharehint" role="status">
          {hint}
        </p>
      </div>
    </div>
  );
}
