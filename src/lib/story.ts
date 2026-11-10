// Imagen vertical (1080×1920) para compartir en historias de Instagram y TikTok. Solo en el navegador.
import { initials } from "./validation";

export type StoryPerson = { name: string; photo: string | null; emoji: string | null; hue: number };

const ICONS = {
  crown: "M5 15 L19 27 L32 6 L45 27 L59 15 L53 41 H11 Z",
  glassL: "M5 5h22v7a11 11 0 0 1-22 0z",
  glassR: "M37 5h22v7a11 11 0 0 1-22 0z",
  ribL: "M5 0h13l10 34H15z",
  ribR: "M30 0h13L33 34H20z",
  star: "M12 1.5l3.1 6.8 7.4.8-5.5 5 1.6 7.3L12 17.6l-6.6 3.8 1.6-7.3-5.5-5 7.4-.8z",
};

function fontVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (v ? v + ", " : "") + fallback;
}

function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, R: number) {
  x.beginPath();
  x.moveTo(X + R, Y);
  x.arcTo(X + W, Y, X + W, Y + H, R);
  x.arcTo(X + W, Y + H, X, Y + H, R);
  x.arcTo(X, Y + H, X, Y, R);
  x.arcTo(X, Y, X + W, Y, R);
  x.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = ko;
    i.src = src;
  });
}

export async function makeStory(e: StoryPerson): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  if (!x) return null;
  const DISPLAY = fontVar("--font-sora", '"Segoe UI", sans-serif');
  const BODY = fontVar("--font-inter", "system-ui, sans-serif");
  const MONO = fontVar("--font-mono", "monospace");
  try {
    await Promise.all(
      [`800 120px ${DISPLAY}`, `700 60px ${DISPLAY}`, `600 44px ${BODY}`, `500 36px ${MONO}`].map((f) => document.fonts.load(f)),
    );
  } catch {}

  // Fondo dorado
  const cx = W / 2;
  const cy = H * 0.4;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, H * 0.78);
  ([[0, "#FFF7DA"], [0.28, "#FDE08A"], [0.56, "#F2BF45"], [0.8, "#D99A1E"], [1, "#A86F05"]] as const).forEach(([o, c]) =>
    g.addColorStop(o, c),
  );
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // Rayos de luz
  x.save();
  x.translate(cx, cy);
  const rg = x.createRadialGradient(0, 0, 0, 0, 0, H * 0.7);
  rg.addColorStop(0, "rgba(255,255,255,.4)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = rg;
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    x.beginPath();
    x.moveTo(0, 0);
    x.arc(0, 0, H, a, a + Math.PI / 30);
    x.closePath();
    x.fill();
  }
  x.restore();

  // Papel pintado de coronas, gafas de sol, medallas y estrellas
  const P = Object.fromEntries(Object.entries(ICONS).map(([k, d]) => [k, new Path2D(d)])) as Record<keyof typeof ICONS, Path2D>;
  x.fillStyle = "rgba(255,255,255,.5)";
  x.strokeStyle = "rgba(154,106,0,.32)";
  x.lineJoin = "round";
  x.lineCap = "round";
  for (let r = 0, y = -40; y < H + 100; r++, y += 250) {
    for (let c = 0, X = (r % 2 ? 125 : 0) - 40; X < W + 100; c++, X += 250) {
      const kind = (r + c * 3) % 4;
      x.save();
      x.translate(X, y);
      x.rotate((((r * 7 + c * 13) % 5) - 2) * 0.14);
      x.scale(1.7, 1.7);
      x.lineWidth = 2.2;
      if (kind === 0) {
        x.fill(P.crown);
        x.stroke(P.crown);
      } else if (kind === 1) {
        x.beginPath();
        x.moveTo(2, 5);
        x.lineTo(62, 5);
        x.lineWidth = 3.5;
        x.stroke();
        x.lineWidth = 2.2;
        x.fill(P.glassL);
        x.stroke(P.glassL);
        x.fill(P.glassR);
        x.stroke(P.glassR);
      } else if (kind === 2) {
        x.fill(P.ribL);
        x.stroke(P.ribL);
        x.fill(P.ribR);
        x.stroke(P.ribR);
        x.beginPath();
        x.arc(24, 46, 17, 0, Math.PI * 2);
        x.fill();
        x.stroke();
      } else {
        x.translate(14, 12);
        x.fill(P.star);
        x.stroke(P.star);
      }
      x.restore();
    }
  }

  // Cristal
  x.font = `800 76px ${DISPLAY}`;
  const MAXW = W - 220;
  const twoLines = x.measureText(e.name).width > MAXW && e.name.includes(" ");
  roundRect(x, 70, 380, W - 140, twoLines ? 1420 : 1340, 64);
  x.fillStyle = "rgba(255,252,240,.62)";
  x.fill();
  x.lineWidth = 8;
  x.strokeStyle = "#fff";
  x.stroke();

  // Foto o avatar
  const S = 520;
  const ax = (W - S) / 2;
  const ay = 300;
  x.save();
  x.shadowColor = "rgba(120,70,0,.55)";
  x.shadowBlur = 60;
  x.shadowOffsetY = 24;
  roundRect(x, ax - 14, ay - 14, S + 28, S + 28, 96);
  x.fillStyle = "#fff";
  x.fill();
  x.restore();
  x.save();
  roundRect(x, ax, ay, S, S, 84);
  x.clip();
  let drawn = false;
  if (e.photo) {
    try {
      x.drawImage(await loadImg(e.photo), ax, ay, S, S);
      drawn = true;
    } catch {}
  }
  if (!drawn) {
    const ag = x.createLinearGradient(ax, ay, ax + S, ay + S);
    ag.addColorStop(0, `hsl(${e.hue} 90% 86%)`);
    ag.addColorStop(1, `hsl(${e.hue} 72% 68%)`);
    x.fillStyle = ag;
    x.fillRect(ax, ay, S, S);
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#16122E";
    if (e.emoji) {
      x.font = '300px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.fillText(e.emoji, W / 2, ay + S / 2 + 14);
    } else {
      x.font = `700 190px ${DISPLAY}`;
      x.fillText(initials(e.name), W / 2, ay + S / 2 + 8);
    }
  }
  x.restore();

  // Corona encima de la foto
  x.save();
  x.translate(ax - 70, ay - 150);
  x.rotate((-16 * Math.PI) / 180);
  x.scale(4.4, 4.4);
  x.shadowColor = "rgba(120,80,0,.45)";
  x.shadowBlur = 8;
  x.shadowOffsetY = 4;
  const cg = x.createLinearGradient(0, 0, 64, 46);
  cg.addColorStop(0, "#FFF0BF");
  cg.addColorStop(0.45, "#F4C752");
  cg.addColorStop(1, "#C98E14");
  x.fillStyle = cg;
  x.strokeStyle = "#6B4A00";
  x.lineWidth = 2.5;
  x.lineJoin = "round";
  x.fill(P.crown);
  x.shadowColor = "transparent";
  x.stroke(P.crown);
  x.beginPath();
  x.moveTo(13, 34);
  x.lineTo(51, 34);
  x.lineCap = "round";
  x.stroke();
  for (const [X, Y, R] of [[5, 15, 3.6], [59, 15, 3.6]]) {
    x.beginPath();
    x.arc(X, Y, R, 0, Math.PI * 2);
    x.fillStyle = cg;
    x.fill();
    x.lineWidth = 2;
    x.stroke();
  }
  x.beginPath();
  x.arc(32, 6, 4.5, 0, Math.PI * 2);
  x.fillStyle = "#FF3D7F";
  x.fill();
  x.lineWidth = 2;
  x.stroke();
  x.restore();

  // Textos
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  x.fillStyle = "rgba(43,29,0,.7)";
  x.font = `500 36px ${MONO}`;
  x.fillText("A H O R A   M I S M O", W / 2, 1010);
  const fit = (t: string, from: number, to: number) => {
    let z = from;
    for (; z > to; z -= 4) {
      x.font = `800 ${z}px ${DISPLAY}`;
      if (x.measureText(t).width <= MAXW) break;
    }
    return z;
  };
  x.fillStyle = "#2B1D00";
  const name = e.name;
  let y = 1140;
  if (twoLines) {
    const spaces = [...name].map((ch, i) => (ch === " " ? i : -1)).filter((i) => i > 0);
    const cut = spaces.reduce((b, i) => (Math.abs(i - name.length / 2) < Math.abs(b - name.length / 2) ? i : b), spaces[0]);
    const l1 = name.slice(0, cut);
    const l2 = name.slice(cut + 1);
    const z = Math.min(fit(l1, 112, 60), fit(l2, 112, 60));
    x.font = `800 ${z}px ${DISPLAY}`;
    x.fillText(l1, W / 2, y - z * 0.1);
    x.fillText(l2, W / 2, y + z * 0.92);
    y += z * 0.92;
  } else {
    x.font = `800 ${fit(name, 128, 60)}px ${DISPLAY}`;
    x.fillText(name, W / 2, y);
  }
  const tg = x.createLinearGradient(200, 0, W - 200, 0);
  tg.addColorStop(0, "#B47A06");
  tg.addColorStop(0.35, "#E3A81D");
  tg.addColorStop(0.65, "#8A5F00");
  tg.addColorStop(1, "#C98E14");
  x.fillStyle = tg;
  x.font = `800 76px ${DISPLAY}`;
  x.fillText("es el más guay", W / 2, y + 120);
  x.fillText("del mundo", W / 2, y + 205);
  x.fillStyle = "rgba(43,29,0,.78)";
  x.font = `600 44px ${BODY}`;
  x.fillText("¿Te atreves a quitarme el puesto?", W / 2, y + 320);

  // Pastilla con la web
  x.font = `700 56px ${DISPLAY}`;
  const pw = x.measureText("elmasguay.com").width + 110;
  const py = y + 390;
  roundRect(x, (W - pw) / 2, py, pw, 110, 55);
  x.fillStyle = "#16122E";
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = "#fff";
  x.stroke();
  x.fillStyle = "#FFD76A";
  x.textBaseline = "middle";
  x.fillText("elmasguay.com", W / 2, py + 58);

  try {
    return await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/png"));
  } catch {
    return null; // la foto no dejó exportar el lienzo
  }
}
