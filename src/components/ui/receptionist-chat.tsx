"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

function sessionId(slug: string): string {
  const k = `gb-chat-${slug}`;
  try {
    const cur = localStorage.getItem(k);
    if (cur && /^[a-zA-Z0-9-]{16,64}$/.test(cur)) return cur;
    const id = crypto.randomUUID();
    localStorage.setItem(k, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Chat da recepcionista virtual. `endpoint` recebe POST {s, text} e GET ?s= (histórico).
 * No link público usa a sessão do navegador; no teste interno, uma sessão fixa.
 */
export function ReceptionistChat({ endpoint, slug, name, salonName, floating = true, fixedSession }: { endpoint: string; slug: string; name: string; salonName: string; floating?: boolean; fixedSession?: string }) {
  const [open, setOpen] = useState(!floating);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sid = useRef<string>("");
  const loaded = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  async function load() {
    if (loaded.current) return;
    loaded.current = true;
    sid.current = fixedSession ?? sessionId(slug);
    try {
      const r = await fetch(`${endpoint}?s=${encodeURIComponent(sid.current)}`);
      const j = await r.json();
      if (Array.isArray(j.messages) && j.messages.length) setMsgs(j.messages);
    } catch {
      /* sem histórico */
    }
  }

  useEffect(() => {
    if (!floating) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    if (!sid.current) await load();
    setErr("");
    setText("");
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setBusy(true);
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ s: sid.current, text: t }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error || "Não consegui responder agora.");
      else if (j.reply) setMsgs((m) => [...m, { role: "assistant", text: j.reply }]);
    } catch {
      setErr("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const panel = (
    <div className={floating ? "fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[600px] sm:w-[380px] sm:rounded-3xl" : "flex h-[520px] flex-col rounded-2xl border border-line bg-white"}>
      <header className="flex items-center gap-3 rounded-t-3xl bg-brand px-4 py-3 text-white">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-lg font-bold">{name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">{name}</p>
          <p className="truncate text-xs text-white/80">Recepcionista virtual · {salonName}</p>
        </div>
        {floating && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15">
            ✕
          </button>
        )}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-mist px-3 py-3">
        {msgs.length === 0 && (
          <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">
            Oi! Eu sou a {name}, do {salonName}. 💕 Posso te passar preços, horários livres e já deixar seu pedido de horário. Como posso ajudar?
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-10 rounded-2xl rounded-tr-sm bg-brand px-3 py-2 text-sm whitespace-pre-wrap text-white" : "mr-10 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm whitespace-pre-wrap shadow-sm"}>
            {m.text}
          </div>
        ))}
        {busy && <div className="mr-10 inline-block rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-muted shadow-sm">digitando…</div>}
        {err && <p className="text-center text-xs text-bad">{err}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Escreva sua mensagem" className="field min-h-11 flex-1 py-2" aria-label="Mensagem" />
        <button className="btn btn-primary min-h-11 px-4" disabled={busy || !text.trim()} aria-label="Enviar">
          Enviar
        </button>
      </form>
      <p className="pb-2 text-center text-[10px] text-muted">Assistente com IA. O horário só vale depois que o salão confirmar.</p>
    </div>
  );

  if (!floating) return panel;
  return (
    <>
      {open ? (
        panel
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            void load();
          }}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-3 font-semibold text-white shadow-xl"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 5h16v11H8l-4 4z" /></svg>
          Dúvidas? Fale com a {name}
        </button>
      )}
    </>
  );
}
