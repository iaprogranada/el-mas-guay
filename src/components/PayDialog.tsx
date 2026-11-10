"use client";

import { useRef, useState } from "react";
import { PLANS, shortEuros, euros, type Plan } from "@/lib/pricing";
import type { Me } from "@/lib/types";
import { checkName, cleanLink, linkProblem, nameProblem, normalizeName, PRESETS } from "@/lib/validation";
import { Avatar, LinkInner, type AvatarLook } from "./Avatar";
import Modal, { closeDialog } from "./Modal";
import SecurePay from "./SecurePay";

export type Choice = { kind: "preset"; i: number } | { kind: "photo"; data: string } | { kind: "keep"; url: string };
export type Draft = { name: string; link: string; choice: Choice };
export type Pending = { orderId: string; token: string | null; draft: Draft };
export type ProfileKey = { id: string; token: string };

export const KEY_ORDER = "elmasguay-pedido";

export function look(name: string, c: Choice): AvatarLook {
  if (c.kind === "photo") return { name, photo: c.data };
  if (c.kind === "keep") return { name, photo: c.url };
  const p = PRESETS[c.i] ?? PRESETS[0];
  return { name, hue: p.hue, emoji: p.emoji };
}

function sameChoice(a: Choice, b: Choice): boolean {
  if (a.kind === "preset" && b.kind === "preset") return a.i === b.i;
  return a.kind !== "preset" && b.kind !== "preset";
}

function startChoice(me: Me | null): Choice {
  if (!me) return { kind: "preset", i: 0 };
  if (me.photo) return { kind: "keep", url: me.photo };
  const i = PRESETS.findIndex((p) => p.hue === me.hue && p.emoji === (me.emoji ?? null));
  return { kind: "preset", i: i >= 0 ? i : 0 };
}

function save(k: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// Recorta la foto a un cuadrado de 256 px en JPEG.
function cropPhoto(file: File): Promise<string> {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const S = 256;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const m = Math.min(img.naturalWidth, img.naturalHeight);
      const ctx = c.getContext("2d");
      if (!ctx || !m) return ko(new Error("foto vacía"));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S, S);
      let data = c.toDataURL("image/jpeg", 0.85);
      if (data.length > 300_000) data = c.toDataURL("image/jpeg", 0.7);
      ok(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      ko(new Error("no es una imagen"));
    };
    img.src = url;
  });
}

type Errors = { name?: string; link?: string; photo?: string; form?: string };

export default function PayDialog({
  me,
  myKey,
  resume,
  onClose,
  onPaid,
  onRules,
  onTerms,
}: {
  me: Me | null;
  myKey: ProfileKey | null;
  resume: Pending | null;
  onClose: () => void;
  onPaid: (playerId: string) => void;
  onRules: () => void;
  onTerms: (section?: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(resume ? 2 : 1);
  const [name, setName] = useState(resume?.draft.name ?? me?.name ?? "");
  const [link, setLink] = useState(resume?.draft.link ?? (me?.link ? me.link.replace(/^https:\/\//, "") : ""));
  const [choice, setChoice] = useState<Choice>(resume?.draft.choice ?? startChoice(me));
  const [myPhoto, setMyPhoto] = useState<Choice | null>(() => {
    const c = resume?.draft.choice ?? startChoice(me);
    return c.kind === "preset" ? (me?.photo ? { kind: "keep", url: me.photo } : null) : c;
  });
  const [plan, setPlan] = useState<Plan>("one");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const order = useRef<Pending | null>(resume);
  const leaving = useRef(false); // true al irse a Stripe o al coronar: entonces no se anula el pedido
  const nameInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const payBtn = useRef<HTMLButtonElement>(null);

  const shownName = normalizeName(name) || "Tu nombre";
  const cleaned = cleanLink(link);

  function close() {
    // Si se cierra sin pagar, se anula el pedido para que no se quede abierto.
    const o = order.current;
    if (o && !leaving.current) {
      fetch(`/api/order?id=${o.orderId}`, { method: "DELETE" }).catch(() => undefined);
      save(KEY_ORDER, null);
    }
    onClose();
  }

  async function onPhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const data = await cropPhoto(f);
      const c: Choice = { kind: "photo", data };
      setMyPhoto(c);
      setChoice(c);
      setErrors((e) => ({ ...e, photo: undefined }));
    } catch {
      setErrors((e) => ({ ...e, photo: "No hemos podido leer esa foto. Prueba con otra en JPG o PNG." }));
    }
  }

  async function submitProfile(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const n = normalizeName(name);
    const errs: Errors = {};
    let why: string | null;
    const nameErr = checkName(n);
    if (nameErr) errs.name = nameErr;
    else if ((why = nameProblem(n))) errs.name = `Ese nombre no se puede publicar porque ${why}. Cámbialo; no se te cobra nada.`;
    if (!errs.name) {
      if (cleaned === null) errs.link = "Ese enlace no parece una web. Prueba algo como instagram.com/tuusuario.";
      else if ((why = linkProblem(cleaned))) errs.link = `Ese enlace no se puede publicar: ${why}. Cámbialo o déjalo vacío; no se te cobra nada.`;
    }
    setErrors(errs);
    if (errs.name) return nameInput.current?.focus();
    if (errs.link) return linkInput.current?.focus();

    const avatar =
      choice.kind === "photo"
        ? { kind: "photo", data: choice.data }
        : choice.kind === "keep"
          ? { kind: "keep" }
          : { kind: "preset", hue: PRESETS[choice.i].hue, emoji: PRESETS[choice.i].emoji };
    setBusy(true);
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, link: cleaned ?? "", avatar, playerId: myKey?.id, token: myKey?.token }),
      });
      const j = (await r.json().catch(() => ({}))) as { orderId?: string; token?: string | null; error?: string; field?: string | null };
      if (!r.ok || !j.orderId) {
        const msg = j.error || "No hemos podido revisar tu perfil. Inténtalo de nuevo.";
        if (j.field === "name") setErrors({ name: msg });
        else if (j.field === "link") setErrors({ link: msg });
        else if (j.field === "photo") setErrors({ photo: msg });
        else setErrors({ form: msg });
        if (j.field === "name") nameInput.current?.focus();
        if (j.field === "link") linkInput.current?.focus();
        return;
      }
      // Si ya había un pedido de antes (volvió atrás y cambió algo), se anula.
      if (order.current && order.current.orderId !== j.orderId) {
        fetch(`/api/order?id=${order.current.orderId}`, { method: "DELETE" }).catch(() => undefined);
      }
      const p: Pending = { orderId: j.orderId, token: j.token ?? null, draft: { name: n, link: link.trim(), choice } };
      order.current = p;
      save(KEY_ORDER, p);
      setStep(2);
      setTimeout(() => payBtn.current?.focus(), 30);
    } catch {
      setErrors({ form: "No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo." });
    } finally {
      setBusy(false);
    }
  }

  async function submitPay(ev: React.FormEvent) {
    ev.preventDefault();
    const o = order.current;
    if (busy || !o) return;
    setBusy(true);
    setErrors({});
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: o.orderId, plan }),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; status?: string; playerId?: string; error?: string };
      if (r.ok && j.url) {
        leaving.current = true;
        window.location.href = j.url;
        return; // el botón se queda en "Abriendo el pago…" mientras carga Stripe
      }
      if (r.ok && j.status === "paid" && j.playerId) {
        leaving.current = true;
        onPaid(j.playerId);
        return;
      }
      if (r.status === 410 || r.status === 409) {
        // El pedido caducó: hay que volver a revisar el perfil.
        order.current = null;
        save(KEY_ORDER, null);
        setStep(1);
      }
      setErrors({ form: j.error || "No hemos podido abrir el pago. Inténtalo de nuevo en un momento." });
      setBusy(false);
    } catch {
      setErrors({ form: "No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo." });
      setBusy(false);
    }
  }

  const photoBtn = (c: Choice, key: string, label: string) => (
    <button key={key} type="button" aria-pressed={sameChoice(c, choice)} aria-label={label} onClick={() => setChoice(c)}>
      <Avatar p={look(normalizeName(name) || "Tú", c)} />
    </button>
  );

  return (
    <Modal labelledBy="pay-title" onClose={close} onOpen={() => setTimeout(() => (step === 1 ? nameInput.current?.focus() : payBtn.current?.focus()), 30)}>
      <form className="dlg" hidden={step !== 1} onSubmit={submitProfile} noValidate>
        <div className="dlghead">
          <div>
            <div className="stepdots">PASO 1 DE 2</div>
            <h3 id={step === 1 ? "pay-title" : undefined}>Así te verá el mundo</h3>
            <p>Solo el nombre es obligatorio.</p>
          </div>
          <button className="x" type="button" aria-label="Cerrar" onClick={(e) => closeDialog(e.currentTarget)}>
            ×
          </button>
        </div>
        <div className="field">
          <label htmlFor="f-name">Nombre de usuario</label>
          <input
            ref={nameInput}
            id="f-name"
            type="text"
            maxLength={30}
            autoComplete="nickname"
            placeholder="Tu nombre, tu marca o Banana Loca"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "e-name" : undefined}
          />
          <p className="hint">
            Sin insultos, palabrotas ni amenazas. Si algo no cumple las{" "}
            <button className="linkbtn" type="button" onClick={onRules}>
              normas
            </button>
            , no se publica y no se te cobra nada.
          </p>
          {errors.name && (
            <p className="err" id="e-name">
              {errors.name}
            </p>
          )}
        </div>
        <div className="field">
          <label id="photo-label">
            Foto <span>(opcional)</span>
          </label>
          <div className="photos" role="group" aria-labelledby="photo-label">
            {PRESETS.map((p, i) => photoBtn({ kind: "preset", i }, "p" + i, i ? "Avatar " + p.emoji : "Tus iniciales"))}
            {myPhoto ? (
              <div className="upload has">
                {photoBtn(myPhoto, "mine", "Tu foto")}
                <label className="linkbtn">
                  Cambiar foto
                  <input type="file" accept="image/*" onChange={onPhoto} />
                </label>
              </div>
            ) : (
              <label className="upload">
                <span className="plus">＋</span>Subir foto<small>o el logo de tu negocio</small>
                <input type="file" accept="image/*" onChange={onPhoto} />
              </label>
            )}
          </div>
          <p className="hint">Tu cara, el logo de tu negocio o un mono con gafas. Revisamos cada foto antes de publicarla.</p>
          {errors.photo && <p className="err">{errors.photo}</p>}
        </div>
        <div className="field">
          <label htmlFor="f-link">
            Enlace <span>(opcional)</span>
          </label>
          <input
            ref={linkInput}
            id="f-link"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="instagram.com/tuusuario"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (errors.link) setErrors((er) => ({ ...er, link: undefined }));
            }}
            aria-invalid={Boolean(errors.link)}
            aria-describedby={errors.link ? "e-link" : undefined}
          />
          <p className="hint">Tu cuenta de Instagram, TikTok o Facebook, tu canal de YouTube o el enlace a tu empresa.</p>
          {errors.link && (
            <p className="err" id="e-link">
              {errors.link}
            </p>
          )}
        </div>
        <div className="preview" aria-hidden="true">
          <Avatar p={look(shownName, choice)} />
          <div>
            <small>Nº 1 · El más guay del mundo</small>
            <strong>{shownName}</strong>
            <div>
              {cleaned ? (
                <span className="klink">
                  <LinkInner url={cleaned} />
                </span>
              ) : (
                <span className="nol">Sin enlace</span>
              )}
            </div>
          </div>
        </div>
        {errors.form && step === 1 && (
          <p className="formerr" role="alert">
            {errors.form}
          </p>
        )}
        <button className={"cta" + (busy ? " busy" : "")} type="submit" disabled={busy}>
          {busy ? (
            <>
              <span className="spin" aria-hidden="true" />
              <span>Revisando tu perfil…</span>
            </>
          ) : (
            <span>Continuar al pago</span>
          )}
        </button>
      </form>

      <form className="dlg" hidden={step !== 2} onSubmit={submitPay} noValidate>
        <div className="dlghead">
          <div>
            <div className="stepdots">PASO 2 DE 2</div>
            <h3 id={step === 2 ? "pay-title" : undefined}>Paga y sube al nº 1</h3>
            <p>Con tarjeta, Apple Pay o Google Pay.</p>
          </div>
          <button className="x" type="button" aria-label="Cerrar" onClick={(e) => closeDialog(e.currentTarget)}>
            ×
          </button>
        </div>
        <div className="opts" role="radiogroup" aria-label="Qué quieres comprar">
          <label className="opt">
            <input type="radio" name="plan" value="one" checked={plan === "one"} onChange={() => setPlan("one")} />
            <span>
              <b>1 coronación</b>
              <small>Subes al nº 1 ahora mismo.</small>
            </span>
            <em>{shortEuros(PLANS.one.cents)}</em>
          </label>
          <label className="opt">
            <input type="radio" name="plan" value="pack" checked={plan === "pack"} onChange={() => setPlan("pack")} />
            <span>
              <b>Pack pique · 5 coronaciones</b>
              <small>Subes ahora y te guardas 4 para recuperar el trono con un toque.</small>
            </span>
            <em>{shortEuros(PLANS.pack.cents)}</em>
          </label>
        </div>
        {errors.form && step === 2 && (
          <p className="formerr" role="alert">
            {errors.form}
          </p>
        )}
        <div>
          <button ref={payBtn} className={"cta" + (busy ? " busy" : "")} type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spin" aria-hidden="true" />
                <span className="lbl">Abriendo el pago…</span>
              </>
            ) : (
              <>
                <span className="lbl">Pagar y ser el más guay</span>
                <span className="price">{euros(PLANS[plan].cents)}</span>
              </>
            )}
          </button>
          <p className="consent">
            IVA incluido. Al pagar aceptas los{" "}
            <button className="linkbtn" type="button" onClick={() => onTerms()}>
              términos
            </button>{" "}
            y que, como la coronación se entrega al momento, pierdes el derecho de desistimiento.
          </p>
          <SecurePay />
        </div>
        <button className="back" type="button" onClick={() => setStep(1)} disabled={busy}>
          ← Volver a mi perfil
        </button>
      </form>
    </Modal>
  );
}
