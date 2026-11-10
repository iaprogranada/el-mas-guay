"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ago, clock, dur, fmt, PER_PAGE } from "@/lib/format";
import { SITE, VERIFIED_AT } from "@/lib/site";
import type { StoryPerson } from "@/lib/story";
import type { Card, Me, Row, SearchHit, Snapshot } from "@/lib/types";
import { host } from "@/lib/validation";
import { Avatar, LinkInner } from "./Avatar";
import Coronation from "./Coronation";
import { Crown, Logo, Medal, MiniCrown } from "./Graphics";
import { RulesContent, TermsContent } from "./Legal";
import Modal, { closeDialog } from "./Modal";
import PayDialog, { KEY_ORDER, type Pending, type ProfileKey } from "./PayDialog";
import SecurePay from "./SecurePay";
import Verified, { VCheck, VName } from "./Verified";

const KEY_ME = "elmasguay-yo";
const POLL_MS = 5000;

function read<T>(k: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") as T | null;
  } catch {
    return null;
  }
}
function write(k: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Toast = { text: string; action?: "retake"; sticky?: boolean };

/* ------------------------------ Piezas ------------------------------ */

function Clock({ since, recordMs, start }: { since: string; recordMs: number | null; start: number }) {
  const [t, setT] = useState(start);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = t - Date.parse(since);
  return (
    <>
      <span className="clock">{clock(ms)}</span>
      <span>{recordMs !== null && ms > recordMs ? <span className="recordflag">¡Batiendo el récord!</span> : null}</span>
    </>
  );
}

function PayLabel({ text, price, king }: { text: string; price: string; king: boolean }) {
  return (
    <>
      <span className="lbl">{text}</span>
      {!king && <span className="price">{price}</span>}
    </>
  );
}

function KingCard({
  snap,
  now,
  mine,
  pop,
  flash,
  onPay,
}: {
  snap: Snapshot;
  now: number;
  mine: boolean;
  pop: boolean;
  flash: boolean;
  onPay: () => void;
}) {
  const k = snap.king;
  if (!k) {
    return (
      <article className="king rim" aria-live="polite">
        <div className="kshine" aria-hidden="true" />
        <div className="kphoto">
          <Crown />
          <span className="av xl empty">?</span>
        </div>
        <div className="kbody">
          <span className="ktag">Nº 1 · EL MÁS GUAY DEL MUNDO</span>
          <h2 id="king-name">El trono está vacío</h2>
        </div>
        <div className="klinkrow">
          <button className="cta emptycta" type="button" onClick={onPay}>
            <span className="lbl">Sé el primero</span>
            <span className="price">1 €</span>
          </button>
        </div>
        <div className="kfoot">
          <p className="prev">Nadie ha sido el más guay del mundo todavía. El primero que pague se queda el trono.</p>
        </div>
      </article>
    );
  }
  const prev = snap.kingPrev;
  return (
    <article key={k.id + k.crownedAt} className={"king rim" + (pop ? " pop" : "") + (flash ? " flash" : "")} aria-live="polite">
      <div className="kshine" aria-hidden="true" />
      <div className="kphoto">
        <Crown />
        <Avatar p={k} size="xl" />
      </div>
      <div className="kbody">
        <span className="ktag">Nº 1 · EL MÁS GUAY DEL MUNDO</span>
        <h2 id="king-name">
          {k.name}
          <Verified times={k.times} tip space />
          {mine && <> <span className="youtag">TÚ</span></>}
        </h2>
      </div>
      <div className="klinkrow">
        {k.link ? (
          <a className="klink" href={k.link} target="_blank" rel="nofollow ugc noopener">
            <LinkInner url={k.link} />
          </a>
        ) : (
          <span className="nolink">Sin enlace, solo gloria</span>
        )}
      </div>
      <div className="kfoot">
        <div className="timer">
          <small>Lleva siendo el más guay</small>
          <Clock since={k.crownedAt} recordMs={snap.fame.record?.ms ?? null} start={now} />
        </div>
        <p className="prev">
          {prev && (
            <>
              Le quitó el trono a <b>{prev.name}</b>
              {prev.ms !== null ? <>, que reinó {dur(prev.ms)}</> : null}.{" "}
            </>
          )}
          {k.times > 1 ? `Es su coronación nº ${fmt(k.times)}.` : prev ? "Es su primera vez." : "Es la primera persona en ser el más guay del mundo."}
        </p>
      </div>
    </article>
  );
}

function RankRow({ r, now, mine, enter, flash }: { r: Row; now: number; mine: boolean; enter: boolean; flash: boolean }) {
  const tier = r.pos === 2 ? 2 : r.pos === 3 ? 3 : 0;
  return (
    <li
      id={"r-" + r.id}
      className={
        "row " + (tier ? "p" + tier : "glass") + " rim" + (mine ? " me" : "") + (enter ? " enter" : "") + (flash ? " flash" : "")
      }
    >
      {tier ? <Medal tier={tier as 2 | 3} /> : null}
      <Avatar p={r} size={tier ? "lg" : "md"} />
      <div className="who">
        <div className="name">
          {r.name}
          <Verified times={r.times} tip />
          {mine && <> <span className="youtag">TÚ</span></>}
          {r.times > 1 && (
            <>
              {" "}
              <span className="times" title="Veces que ha sido el nº 1">
                <MiniCrown />×{r.times}
              </span>
            </>
          )}
        </div>
        {r.link ? (
          <a className="lnk" href={r.link} target="_blank" rel="nofollow ugc noopener">
            {host(r.link)}
          </a>
        ) : (
          <span className="nol">Sin enlace</span>
        )}
        <div className="meta">
          Nº 1 {ago(r.crownedAt, now)} · reinó <b>{dur(r.lastReignMs)}</b>
        </div>
      </div>
      <span className="rank">
        <small>nº</small>
        {fmt(r.pos)}
      </span>
    </li>
  );
}

function pageItems(cur: number, last: number): number[] {
  const s = new Set([1, last, cur - 1, cur, cur + 1]);
  if (cur <= 3) [2, 3, 4].forEach((x) => s.add(x));
  if (cur >= last - 2) [last - 1, last - 2, last - 3].forEach((x) => s.add(x));
  const arr = [...s].filter((x) => x >= 1 && x <= last).sort((a, b) => a - b);
  const out: number[] = [];
  let prev = 0;
  for (const x of arr) {
    if (x - prev > 1) out.push(0);
    out.push(x);
    prev = x;
  }
  return out;
}

function SidePanels({
  snap,
  now,
  fresh,
  king,
  price,
  onPay,
}: {
  snap: Snapshot;
  now: number;
  fresh: boolean;
  king: boolean;
  price: string;
  onPay: () => void;
}) {
  const { record, most, shortest } = snap.fame;
  return (
    <>
      <div className="box glass rim">
        <h3>
          En directo <small>destronamientos</small>
        </h3>
        {snap.feed.length ? (
          <ul className="feed">
            {snap.feed.map((v, i) => (
              <li key={v.id} className={fresh && i === 0 ? "new" : undefined}>
                <Avatar p={v.w} size="sm" />
                <div>
                  {v.l ? (
                    <>
                      <b>{v.w.name}</b>
                      <Verified times={v.w.times} space /> le quitó el trono a <b>{v.l.name}</b>
                      <Verified times={v.l.times} space />
                    </>
                  ) : (
                    <>
                      <b>{v.w.name}</b>
                      <Verified times={v.w.times} space /> estrenó el trono
                    </>
                  )}
                  <small>
                    {ago(v.at, now)}
                    {v.ms !== null && v.l ? " · reinó " + dur(v.ms) : ""}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aún no ha pasado nada. ¿Empiezas tú?</p>
        )}
      </div>
      <div className="box glass rim">
        <h3>Pique del momento</h3>
        {snap.pique ? (
          <>
            <div className="duel">
              <div className="p">
                <Avatar p={snap.pique.a} />
                <VName p={snap.pique.a} />
              </div>
              <div className="score">
                {snap.pique.a.times}
                <i>–</i>
                {snap.pique.b.times}
              </div>
              <div className="p">
                <Avatar p={snap.pique.b} />
                <VName p={snap.pique.b} />
              </div>
            </div>
            <p className="duelcap">Veces que cada uno ha sido el nº 1</p>
          </>
        ) : (
          <p className="muted">Cuando dos personas se quiten el trono varias veces, su pique saldrá aquí.</p>
        )}
      </div>
      <div className="box glass rim">
        <h3>Salón de la fama</h3>
        {record || most || shortest ? (
          <ul className="fame">
            {record && <FameItem c={record} label="Reinado más largo" value={dur(record.ms)} />}
            {most && <FameItem c={most} label="Más veces nº 1" value={`${fmt(most.times)} veces`} />}
            {shortest && <FameItem c={shortest} label="Reinado más corto" value={dur(shortest.ms)} extra=". Visto y no visto." />}
          </ul>
        ) : (
          <p className="muted">Los récords aparecerán con las primeras coronaciones.</p>
        )}
      </div>
      <div className="box glass rim">
        <div className="nums">
          <div>
            <b>{fmt(snap.total)}</b>
            <span>{snap.total === 1 ? "persona ha sido el más guay" : "personas han sido el más guay"}</span>
          </div>
          <div>
            <b>{fmt(snap.today)}</b>
            <span>{snap.today === 1 ? "coronación hoy" : "coronaciones hoy"}</span>
          </div>
        </div>
      </div>
      <div className="box temptbox rim">
        <h3>¿Y si fueras tú?</h3>
        <p>1 € y eres el primero. Lo que dure, dure.</p>
        <button className="cta" type="button" onClick={onPay} disabled={king}>
          <PayLabel text="Ser el más guay" price={price} king={king} />
        </button>
      </div>
    </>
  );
}

function FameItem({ c, label, value, extra = "" }: { c: Card; label: string; value: string; extra?: string }) {
  return (
    <li>
      <Avatar p={c} size="sm" />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <VName p={c} extra={extra} />
      </div>
    </li>
  );
}

/* ------------------------------ App ------------------------------ */

export default function RankingApp({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.now));
  const [fresh, setFresh] = useState(false);
  const [myKey, setMyKey] = useState<ProfileKey | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [pay, setPay] = useState<{ resume: Pending | null } | null>(null);
  const [terms, setTerms] = useState<{ section?: string } | null>(null);
  const [rules, setRules] = useState(false);
  const [crowned, setCrowned] = useState<StoryPerson | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [gotoVal, setGotoVal] = useState("");

  const snapRef = useRef(snap);
  const keyRef = useRef<ProfileKey | null>(null);
  const loading = useRef(false);
  const seq = useRef(0); // solo vale la respuesta de la última petición
  const jumpAfter = useRef<string | null>(null);
  const listHead = useRef<HTMLDivElement>(null);

  const king = Boolean(me && me.pos === 1);
  const price = me && me.credits > 0 ? `1 de ${me.credits}` : "1 €";

  /* ----- datos ----- */

  const loadMe = useCallback(async (k: ProfileKey | null) => {
    if (!k) return setMe(null);
    try {
      const r = await fetch(`/api/me?id=${k.id}`, { cache: "no-store" });
      if (r.status === 404) {
        // El perfil ya no existe (se borró a mano): este navegador lo olvida.
        write(KEY_ME, null);
        keyRef.current = null;
        setMyKey(null);
        setMe(null);
        return;
      }
      if (r.ok) setMe((await r.json()) as Me);
    } catch {}
  }, []);

  const load = useCallback(
    async (page: number, bust = false): Promise<Snapshot | null> => {
      if (loading.current && !bust) return null;
      loading.current = true;
      const my = ++seq.current;
      try {
        const r = await fetch(`/api/live?pagina=${page}${bust ? `&t=${Date.now()}` : ""}`);
        if (!r.ok || my !== seq.current) return null;
        const s = (await r.json()) as Snapshot;
        if (my !== seq.current) return null;
        const prev = snapRef.current;
        const changed = s.version !== prev.version;
        const mineId = keyRef.current?.id;
        if (changed && mineId && prev.king?.id === mineId && s.king && s.king.id !== mineId) {
          setToast({ text: `${s.king.name} te ha quitado el trono. Ahora eres el nº 2.`, action: "retake" });
        }
        setFresh(changed && s.page === 1 && prev.page === 1 && prev.version > 0);
        snapRef.current = s;
        setSnap(s);
        setNow(Date.now());
        if (changed && keyRef.current) loadMe(keyRef.current);
        return s;
      } catch {
        return null;
      } finally {
        if (my === seq.current) loading.current = false;
      }
    },
    [loadMe],
  );

  // Cada 5 segundos, mientras la pestaña está a la vista.
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) load(snapRef.current.page);
    };
    const id = setInterval(tick, POLL_MS);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    const clockId = setInterval(() => setNow(Date.now()), 20_000);
    return () => {
      clearInterval(id);
      clearInterval(clockId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  /* ----- coronación ----- */

  const celebrate = useCallback(
    async (playerId: string) => {
      const pend = read<Pending>(KEY_ORDER);
      const stored = read<ProfileKey>(KEY_ME);
      const k: ProfileKey | null = pend?.token
        ? { id: playerId, token: pend.token }
        : stored?.id === playerId
          ? stored
          : keyRef.current?.id === playerId
            ? keyRef.current
            : null;
      if (k) write(KEY_ME, k);
      write(KEY_ORDER, null);
      keyRef.current = k;
      setMyKey(k);
      setPay(null);
      setToast(null);
      const s = await load(1, true);
      let person: StoryPerson | null = s?.king?.id === playerId ? s.king : null;
      try {
        const r = await fetch(`/api/me?id=${playerId}`, { cache: "no-store" });
        if (r.ok) {
          const m = (await r.json()) as Me;
          setMe(m);
          person = m;
        }
      } catch {}
      if (person) setCrowned({ name: person.name, photo: person.photo, emoji: person.emoji, hue: person.hue });
    },
    [load],
  );

  const spendCredit = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    setToast({ text: "Usando una coronación guardada…", sticky: true });
    try {
      const r = await fetch("/api/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: k.id, token: k.token }),
      });
      const j = (await r.json().catch(() => ({}))) as { playerId?: string; error?: string };
      if (r.ok && j.playerId) return celebrate(j.playerId);
      setToast({ text: j.error || "No hemos podido usar tu coronación. Inténtalo de nuevo." });
      loadMe(k);
    } catch {
      setToast({ text: "No hemos podido conectar. Inténtalo de nuevo." });
    }
  }, [celebrate, loadMe]);

  const openPay = useCallback(() => {
    if (me && me.pos === 1) return;
    if (me && me.credits > 0) {
      spendCredit();
      return;
    }
    setPay({ resume: null });
  }, [me, spendCredit]);

  /* ----- al cargar: perfil guardado y vuelta del pago ----- */

  useEffect(() => {
    const k = read<ProfileKey>(KEY_ME);
    keyRef.current = k;
    setMyKey(k);
    loadMe(k);
    setNow(Date.now());

    const params = new URLSearchParams(window.location.search);
    const result = params.get("pago");
    const orderId = params.get("pedido");
    if (result) window.history.replaceState(null, "", window.location.pathname);
    const pend = read<Pending>(KEY_ORDER);
    const id = orderId || pend?.orderId;
    if (!id) {
      load(snapRef.current.page);
      return;
    }

    (async () => {
      const status = async () => {
        try {
          const r = await fetch(`/api/order?id=${id}`, { cache: "no-store" });
          if (r.status === 404) return { status: "missing" as const, playerId: null };
          return (await r.json()) as { status: string; playerId: string | null };
        } catch {
          return { status: "error", playerId: null };
        }
      };

      if (result === "ok") {
        setToast({ text: "Confirmando tu pago…", sticky: true });
        for (let i = 0; i < 40; i++) {
          const s = await status();
          if (s.status === "paid" && s.playerId) return celebrate(s.playerId);
          if (s.status === "cancelled" || s.status === "missing") {
            write(KEY_ORDER, null);
            return setToast({ text: "El pago no se completó. No se te ha cobrado nada." });
          }
          await wait(1500);
        }
        return setToast({ text: "Tu pago se está confirmando. En cuanto llegue, subirás al nº 1." });
      }

      const s = await status();
      if (s.status === "paid" && s.playerId) {
        if (result === "cancelado") return celebrate(s.playerId);
        // Un pago que terminó en otra pestaña: se guarda el perfil sin fiesta.
        const k2: ProfileKey | null = pend?.token ? { id: s.playerId, token: pend.token } : null;
        if (k2) {
          write(KEY_ME, k2);
          keyRef.current = k2;
          setMyKey(k2);
          loadMe(k2);
        }
        write(KEY_ORDER, null);
      } else if (s.status === "pending" && result === "cancelado" && pend?.orderId === id) {
        setPay({ resume: pend }); // vuelve al paso 2 para que pueda elegir otra opción o cerrar
      } else if (s.status !== "pending" && s.status !== "error") {
        write(KEY_ORDER, null);
      }
      load(snapRef.current.page);
    })();
  }, []);

  // Los avisos se van solos a los 7 segundos.
  useEffect(() => {
    if (!toast || toast.sticky) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);

  /* ----- navegación ----- */

  function flash(id: string) {
    setFlashId(id);
    setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1600);
  }

  async function goPage(n: number, scroll = true) {
    const s = await load(Math.max(1, n), true);
    if (s && scroll) listHead.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function jump(id: string, pos: number) {
    if (pos === 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      flash("king");
      return;
    }
    const pg = Math.ceil(pos / PER_PAGE);
    if (pg !== snapRef.current.page) {
      jumpAfter.current = id;
      await load(pg, true);
    } else scrollToRow(id);
  }

  function scrollToRow(id: string) {
    const el = document.getElementById("r-" + id);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    flash(id);
  }

  useEffect(() => {
    if (jumpAfter.current) {
      const id = jumpAfter.current;
      jumpAfter.current = null;
      requestAnimationFrame(() => scrollToRow(id));
    }
  }, [snap]);

  // Buscador
  useEffect(() => {
    const v = q.trim();
    if (!v) {
      setHits(null);
      return;
    }
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(v)}`, { signal: ctl.signal });
        if (r.ok) setHits((await r.json()) as SearchHit[]);
      } catch {}
    }, 250);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q, snap.version]);

  function closeCoronation() {
    setCrowned(null);
    if (snapRef.current.page !== 1) goPage(1, false);
    window.scrollTo({ top: 0 });
    flash("king");
  }

  /* ----- pintar ----- */

  const rows = snap.page === 1 ? snap.rows.filter((r) => r.pos > 1) : snap.rows;
  const first = rows[0]?.pos;
  const last = rows[rows.length - 1]?.pos;
  const mineId = myKey?.id;
  const openTerms = (section?: string) => setTerms({ section });
  const legalLinks = (
    <span className="links">
      <button className="linkbtn" type="button" onClick={() => setRules(true)}>
        Normas
      </button>
      <button className="linkbtn" type="button" onClick={() => openTerms()}>
        Términos de uso
      </button>
      <button className="linkbtn" type="button" onClick={() => openTerms("t-privacidad")}>
        Privacidad
      </button>
      <button className="linkbtn" type="button" onClick={() => openTerms("t-aviso")}>
        Aviso legal
      </button>
    </span>
  );
  const panels = <SidePanels snap={snap} now={now} fresh={fresh} king={king} price={price} onPay={openPay} />;

  return (
    <>
      <header className="head">
        <div className="wrap">
          <a className="logo" href="/" aria-label="El más guay del mundo, inicio">
            <Logo />
            <h1>
              El más <span className="goldtxt">guay</span> del mundo
            </h1>
          </a>
          <p className="claim">
            <b>¿Quieres ser el más guay del mundo?</b> Paga 1 € y te pones el primero hasta que otro pague.
          </p>
          <span className="spacer" />
          <span className="live">En directo</span>
          <button className="cta" type="button" onClick={openPay} disabled={king}>
            <PayLabel text="Ser el más guay" price={price} king={king} />
          </button>
        </div>
      </header>

      <div className="wrap">
        <div className="layout">
          <aside className="side left" aria-label="Buscador y tu puesto">
            <div className="box youbox">
              <h3>Tu puesto</h3>
              {me ? (
                <>
                  <div className="you">
                    <Avatar p={me} />
                    <div>
                      <strong>nº {fmt(me.pos)}</strong>
                      <span>
                        de {fmt(me.total)}
                        {me.pos > 1 && (
                          <>
                            {" · "}
                            <button className="linkbtn" type="button" onClick={() => jump(me.id, me.pos)}>
                              verme
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="vgoal">
                    {me.times >= VERIFIED_AT ? (
                      <>
                        <Verified times={me.times} tip />
                        <span>
                          Eres <b>guay verificado</b>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="verified" aria-hidden="true">
                          <VCheck />
                        </span>
                        <span>
                          Te {VERIFIED_AT - me.times === 1 ? "falta" : "faltan"} <b>{fmt(VERIFIED_AT - me.times)}</b>{" "}
                          {VERIFIED_AT - me.times === 1 ? "coronación" : "coronaciones"} para el check azul
                        </span>
                      </>
                    )}
                  </p>
                  {me.credits > 0 && (
                    <p className="hint">
                      Te {me.credits === 1 ? "queda 1 coronación" : `quedan ${me.credits} coronaciones`} del pack.
                    </p>
                  )}
                  <button className="cta big" type="button" onClick={openPay} disabled={king}>
                    <PayLabel
                      text={king ? "Eres el más guay del mundo. Aguanta 😎" : "Volver a ser el más guay 😉"}
                      price={price}
                      king={king}
                    />
                  </button>
                </>
              ) : (
                <>
                  <p className="hint" style={{ margin: 0 }}>
                    {snap.total
                      ? `Todavía no estás en el ranking. Ya hay ${fmt(snap.total)} ${snap.total === 1 ? "persona que ha sido" : "personas que han sido"} el más guay.`
                      : "Todavía no estás en el ranking. Nadie ha sido el más guay todavía: el trono te espera."}
                  </p>
                  <button className="cta big" type="button" onClick={openPay}>
                    <PayLabel text="Ser el más guay del mundo 😉" price="1 €" king={false} />
                  </button>
                </>
              )}
              {!king && <SecurePay />}
            </div>
            <div className="box search glass rim">
              <label htmlFor="q">Busca a alguien</label>
              <input
                id="q"
                type="search"
                placeholder="Ej.: Banana Loca"
                autoComplete="off"
                maxLength={30}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {hits && hits.length > 0 && (
                <ul className="results">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => jump(h.id, h.pos)}>
                        <Avatar p={h} size="sm" />
                        <VName p={h} className="nm" />
                        <span className="pos">nº {fmt(h.pos)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(!hits || hits.length === 0) && (
                <p className="hint">
                  {q.trim() && hits ? "Nadie con ese nombre todavía. Puedes ser el primero." : "Escribe un nombre y te decimos en qué puesto está."}
                </p>
              )}
            </div>
            <div className="box howbox glass rim">
              <h3>Cómo funciona</h3>
              <ol className="howlist">
                <li>Pagas 1 € y subes al nº 1.</li>
                <li>Tu foto, tu nombre y tu enlace, arriba del todo.</li>
                <li>Cuando otro paga, bajas un puesto.</li>
                <li>Llega a {VERIFIED_AT} coronaciones y tendrás el check azul de guay verificado.</li>
              </ol>
              <p className="hint">{legalLinks}</p>
            </div>
          </aside>

          <main aria-labelledby="king-name">
            <div className="kingwrap">
              <KingCard
                snap={snap}
                now={now}
                mine={Boolean(mineId && snap.king?.id === mineId)}
                pop={fresh}
                flash={flashId === "king"}
                onPay={openPay}
              />
            </div>
            <div className="slot">
              <aside className="side" aria-label="En directo">
                {panels}
              </aside>
            </div>
            <div className="listhead" ref={listHead}>
              <h2>Los que ya fueron el más guay</h2>
              {first && last ? (
                <span>
                  Puestos {fmt(first)}–{fmt(last)} · página {fmt(snap.page)} de {fmt(snap.lastPage)}
                </span>
              ) : null}
            </div>
            <ol className="list">
              {rows.length ? (
                rows.map((r) => (
                  <RankRow
                    key={r.id}
                    r={r}
                    now={now}
                    mine={r.id === mineId}
                    enter={fresh && r.pos === 2}
                    flash={flashId === r.id}
                  />
                ))
              ) : (
                <li className="emptylist glass rim">
                  {snap.king
                    ? "Aquí aparecerán los que le quiten el trono. ¿Serás el siguiente?"
                    : "Todavía no hay nadie. El primero en pagar se queda el trono."}
                </li>
              )}
            </ol>
            {snap.lastPage > 1 && (
              <>
                <nav className="pager" aria-label="Páginas del ranking">
                  <button
                    className="pg edge"
                    type="button"
                    disabled={snap.page === 1}
                    aria-label="Página anterior"
                    onClick={() => goPage(snap.page - 1)}
                  >
                    ‹<span className="lbl"> Anterior</span>
                  </button>
                  {pageItems(snap.page, snap.lastPage).map((x, i) =>
                    x === 0 ? (
                      <span key={"g" + i} className="pg gap" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={x}
                        className="pg"
                        type="button"
                        aria-current={x === snap.page ? "page" : undefined}
                        aria-label={"Página " + x}
                        onClick={() => goPage(x)}
                      >
                        {fmt(x)}
                      </button>
                    ),
                  )}
                  <button
                    className="pg edge"
                    type="button"
                    disabled={snap.page === snap.lastPage}
                    aria-label="Página siguiente"
                    onClick={() => goPage(snap.page + 1)}
                  >
                    <span className="lbl">Siguiente </span>›
                  </button>
                </nav>
                <form
                  className="goto"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number.parseInt(gotoVal, 10);
                    if (n >= 1) goPage(Math.min(n, snap.lastPage));
                  }}
                >
                  <label htmlFor="gotoinput">Ir a la página</label>
                  <input
                    id="gotoinput"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={snap.lastPage}
                    placeholder={"1–" + snap.lastPage}
                    value={gotoVal}
                    onChange={(e) => setGotoVal(e.target.value)}
                  />
                  <button className="ghost" type="submit">
                    Ir
                  </button>
                </form>
              </>
            )}
          </main>

          <aside className="side right" aria-label="En directo">
            {panels}
          </aside>
        </div>
      </div>

      <footer>
        <div className="wrap">
          <span>
            {SITE.domain} es un proyecto de {SITE.agency} ·{" "}
            <a className="footlink" href={SITE.agencyUrl} target="_blank" rel="noopener">
              {SITE.agencyLabel}
            </a>
          </span>
          {legalLinks}
        </div>
      </footer>

      <div className="bar on">
        <div className="wrap">
          <div className="txt">
            {!me ? (
              <>
                <b>{fmt(snap.total)}</b> {snap.total === 1 ? "persona ya ha sido" : "personas ya han sido"} el más guay
              </>
            ) : king ? (
              <>
                <b>Eres el nº 1</b> del mundo. Aguanta.
              </>
            ) : (
              <>
                Eres el <b>nº {fmt(me.pos)}</b> de {fmt(me.total)} ·{" "}
                <button className="linkbtn" type="button" onClick={() => jump(me.id, me.pos)}>
                  verme
                </button>
              </>
            )}
          </div>
          <button className="cta" type="button" onClick={openPay} disabled={king}>
            <PayLabel text="Ser el más guay 😉" price={price} king={king} />
          </button>
        </div>
      </div>

      {pay && (
        <PayDialog
          me={me}
          myKey={myKey}
          resume={pay.resume}
          onClose={() => setPay(null)}
          onPaid={celebrate}
          onRules={() => setRules(true)}
          onTerms={openTerms}
        />
      )}

      {terms && (
        <Modal
          labelledBy="terms-title"
          onClose={() => setTerms(null)}
          onOpen={(d) => {
            d.scrollTop = 0;
            if (terms.section) document.getElementById(terms.section)?.scrollIntoView({ block: "start" });
          }}
        >
          <div className="dlg terms">
            <div className="dlghead">
              <div>
                <h3 id="terms-title">Términos de uso</h3>
                <p>Normas, pago, privacidad y aviso legal.</p>
              </div>
              <button className="x" type="button" aria-label="Cerrar" onClick={(e) => closeDialog(e.currentTarget)}>
                ×
              </button>
            </div>
            <TermsContent />
          </div>
        </Modal>
      )}

      {rules && (
        <Modal labelledBy="rules-title" onClose={() => setRules(false)}>
          <div className="dlg terms">
            <div className="dlghead">
              <div>
                <h3 id="rules-title">Normas</h3>
                <p>Para que el ranking sea divertido para todo el mundo.</p>
              </div>
              <button className="x" type="button" aria-label="Cerrar" onClick={(e) => closeDialog(e.currentTarget)}>
                ×
              </button>
            </div>
            <RulesContent />
          </div>
        </Modal>
      )}

      {crowned && <Coronation person={crowned} onClose={closeCoronation} />}

      {toast && (
        <div>
          <div className={"toast" + (toast.action ? "" : " plain")} role="status">
            <span>{toast.text}</span>
            {toast.action === "retake" && (
              <button
                className="cta"
                type="button"
                onClick={() => {
                  setToast(null);
                  openPay();
                }}
              >
                Recuperarlo
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
