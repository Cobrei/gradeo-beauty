"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ActionResult } from "@/lib/errors";
import { formatPhone } from "@/lib/phone";
import { formatBRL } from "@/lib/money";
import { addDays, formatLongDate, hhmm, minutesOf } from "@/lib/time";

type Svc = { id: string; name: string; durationMin: number; priceCents: number; category: string };
type Pro = { id: string; name: string; nickname: string | null; color: string; serviceIds: string[] };
type Client = { id: string; fullName: string; phone: string | null; visitsCount: number };
type Item = { serviceId: string; proId: string | null; time: string | null; durationMin: number; price: string };

interface Props {
  services: Svc[];
  pros: Pro[];
  initialDate: string;
  initialClient?: Client;
  initialPro?: string;
  initialTime?: string;
  returnTo?: string;
  action: (prev: ActionResult<unknown> | null, fd: FormData) => Promise<ActionResult<unknown>>;
}

const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/**
 * Novo agendamento em passos, com vários serviços na mesma visita
 * (ex.: corte + coloração + unhas), cada um com quem atende e o horário.
 */
export function BookingWizard({ services, pros, initialDate, initialClient, initialPro, initialTime, returnTo, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Record<string, string[] | "loading">>({});
  const [svcFilter, setSvcFilter] = useState("");
  const usedInitialTime = useRef(false);

  const svcById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const prosFor = (serviceId: string) => pros.filter((p) => !p.serviceIds.length || p.serviceIds.includes(serviceId));

  // busca de clientes enquanto digita (com pequena espera entre as teclas)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);
  function onSearch(v: string) {
    setQ(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    searchTimer.current = setTimeout(() => {
      fetch(`/api/clientes/busca?q=${encodeURIComponent(v.trim())}`)
        .then((r) => r.json())
        .then((d) => { if (seq === searchSeq.current) setResults(d.rows ?? []); })
        .catch(() => {})
        .finally(() => { if (seq === searchSeq.current) setSearching(false); });
    }, 220);
  }

  // horários livres de cada serviço/profissional
  const keyOf = (it: Item) => `${date}|${it.proId}|${it.serviceId}`;
  const requested = useRef(new Set<string>());
  function loadSlots(d: string, proId: string, serviceId: string) {
    const k = `${d}|${proId}|${serviceId}`;
    if (requested.current.has(k)) return;
    requested.current.add(k);
    setSlots((m) => ({ ...m, [k]: "loading" }));
    fetch(`/api/agenda/slots?d=${d}&pro=${proId}&s=${serviceId}`)
      .then((r) => r.json())
      .then((res) => {
        const arr: string[] = res.slots ?? [];
        setSlots((m) => ({ ...m, [k]: arr }));
        // já marca o horário logo depois do serviço anterior, se estiver livre
        setItems((list) => fillSuggestions(list, d, { ...slotsRef.current, [k]: arr }));
      })
      .catch(() => setSlots((m) => ({ ...m, [k]: [] })));
  }
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // horário sugerido: logo depois do serviço anterior
  function suggestedFor(idx: number, list: Item[]): string | null {
    if (idx === 0) return null;
    const prev = list[idx - 1];
    return prev.time ? hhmm(minutesOf(prev.time) + prev.durationMin) : null;
  }

  function toggleService(id: string) {
    setItems((list) => {
      if (list.some((i) => i.serviceId === id)) return list.filter((i) => i.serviceId !== id);
      const s = svcById.get(id)!;
      const options = prosFor(id);
      const pre = initialPro && options.some((p) => p.id === initialPro) ? initialPro : options.length === 1 ? options[0].id : null;
      let time: string | null = null;
      if (!list.length && initialTime && !usedInitialTime.current) {
        time = initialTime;
        usedInitialTime.current = true;
      }
      if (pre) loadSlots(date, pre, id);
      return [...list, { serviceId: id, proId: pre, time, durationMin: s.durationMin, price: money(s.priceCents) }];
    });
  }
  const update = (idx: number, patch: Partial<Item>) => {
    if (patch.proId) loadSlots(date, patch.proId, items[idx].serviceId);
    setItems((list) => fillSuggestions(list.map((it, i) => (i === idx ? { ...it, ...patch } : it)), date, slotsRef.current));
  };

  function changeDate(d: string) {
    setDate(d);
    setItems((list) => list.map((it) => ({ ...it, time: null })));
    for (const it of items) if (it.proId) loadSlots(d, it.proId, it.serviceId);
  }

  function fillSuggestions(list: Item[], d: string, map: Record<string, string[] | "loading">): Item[] {
    let changed = false;
    const next = [...list];
    for (let idx = 1; idx < next.length; idx++) {
      const it = next[idx];
      if (it.time || !it.proId) continue;
      const sug = suggestedFor(idx, next);
      const av = map[`${d}|${it.proId}|${it.serviceId}`];
      if (sug && Array.isArray(av) && av.includes(sug)) {
        next[idx] = { ...it, time: sug };
        changed = true;
      }
    }
    return changed ? next : list;
  }

  const total = items.reduce((a, it) => a + Math.round(Number(it.price.replace(/\./g, "").replace(",", ".")) * 100 || 0), 0);
  const ready = items.length > 0 && items.every((it) => it.proId && it.time);
  const step = (n: number, done: boolean) => (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${done ? "bg-brand text-white" : "bg-mist text-muted"}`}>{n}</span>
  );
  const shown = services.filter((s) => !svcFilter || s.name.toLowerCase().includes(svcFilter.toLowerCase()));

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <div role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          {state.message}
        </div>
      )}
      <input type="hidden" name="clientId" value={client?.id ?? ""} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((it) => ({ serviceId: it.serviceId, professionalId: it.proId, time: it.time, durationMin: it.durationMin, price: it.price })))} />
      {returnTo && <input type="hidden" name="return" value={returnTo} />}

      {/* 1. Cliente */}
      <section className="card">
        <div className="mb-3 flex items-center gap-2">{step(1, !!client)}<h2 className="font-bold">Cliente</h2></div>
        {client ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{client.fullName}</div>
              <div className="text-xs text-muted">{formatPhone(client.phone)} · {client.visitsCount} visitas</div>
            </div>
            <button type="button" onClick={() => { setClient(undefined); onSearch(""); }} className="text-sm font-semibold text-brand">trocar</button>
          </div>
        ) : (
          <div className="relative">
            <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Digite o nome ou o telefone" className="field" autoFocus autoComplete="off" />
            {q.trim().length >= 2 && (
              <ul className="mt-1 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {results.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setClient(r)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-mist">
                      <span className="truncate text-sm font-semibold">{r.fullName}</span>
                      <span className="shrink-0 text-xs text-muted">{formatPhone(r.phone)} · {r.visitsCount} visitas</span>
                    </button>
                  </li>
                ))}
                {!searching && results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Ninguém com esse nome. Cliente nova: siga em frente e informe nome e WhatsApp no final.</li>}
                {searching && results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Buscando…</li>}
              </ul>
            )}
            {q.trim().length < 2 && <p className="mt-2 text-xs text-muted">Digite as primeiras letras: as clientes aparecem enquanto você escreve. Cliente nova? Siga em frente.</p>}
          </div>
        )}
      </section>

      {/* 2. Serviços */}
      <section className="card">
        <div className="mb-1 flex items-center gap-2">{step(2, items.length > 0)}<h2 className="font-bold">Serviços</h2></div>
        <p className="mb-3 text-sm text-muted">Marque todos que a cliente vai fazer nesta visita.</p>
        {services.length > 8 && <input value={svcFilter} onChange={(e) => setSvcFilter(e.target.value)} placeholder="Filtrar serviços…" className="field mb-3" />}
        <div className="grid gap-2 sm:grid-cols-2">
          {shown.map((s) => {
            const on = items.some((i) => i.serviceId === s.id);
            return (
              <button type="button" key={s.id} onClick={() => toggleService(s.id)} aria-pressed={on} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${on ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand"}`}>
                <span className="flex items-center gap-2">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${on ? "border-brand bg-brand text-white" : "border-line"}`}>{on ? "✓" : ""}</span>
                  <span className="font-semibold">{s.name}</span>
                </span>
                <span className="text-xs text-muted">{s.durationMin} min · {formatBRL(s.priceCents)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Dia, profissional e horário de cada serviço */}
      {items.length > 0 && (
        <section className="card">
          <div className="mb-3 flex items-center gap-2">{step(3, ready)}<h2 className="font-bold">Dia, quem atende e horário</h2></div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => changeDate(addDays(date, -1))} className="btn btn-secondary btn-sm" aria-label="Dia anterior">‹</button>
            <span className="min-w-44 text-center text-sm font-semibold capitalize">{formatLongDate(date)}</span>
            <button type="button" onClick={() => changeDate(addDays(date, 1))} className="btn btn-secondary btn-sm" aria-label="Próximo dia">›</button>
            <input type="date" value={date} onChange={(e) => e.target.value && changeDate(e.target.value)} className="field min-h-9 w-auto py-1 text-sm" />
          </div>
          <div className="space-y-4">
            {items.map((it, idx) => {
              const s = svcById.get(it.serviceId)!;
              const options = prosFor(it.serviceId);
              const av = it.proId ? slots[keyOf(it)] : undefined;
              const sug = suggestedFor(idx, items);
              return (
                <div key={it.serviceId} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-bold">{s.name} <span className="text-xs font-normal text-muted">· {it.durationMin} min</span></div>
                    {it.time && <div className="text-sm font-semibold text-brand">{it.time} às {hhmm(minutesOf(it.time) + it.durationMin)}</div>}
                  </div>
                  {options.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">Ninguém da equipe faz este serviço. Ajuste em Equipe.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {options.map((p) => (
                        <button type="button" key={p.id} onClick={() => update(idx, { proId: p.id, time: null })} className={`chip gap-1.5 ${it.proId === p.id ? "chip-on" : ""}`}>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                          {p.nickname ?? p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {it.proId && (
                    <div className="mt-3">
                      {av === "loading" || av === undefined ? (
                        <p className="text-sm text-muted">Buscando horários livres…</p>
                      ) : av.length === 0 ? (
                        <p className="text-sm text-muted">Sem horário livre neste dia. Troque o dia, a profissional, ou digite uma hora abaixo e marque &quot;encaixar&quot;.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {av.map((t) => (
                            <button type="button" key={t} onClick={() => update(idx, { time: t })} className={`chip ${it.time === t ? "chip-on" : ""} ${sug === t && it.time !== t ? "border-gold" : ""}`} title={sug === t ? "Logo depois do serviço anterior" : undefined}>
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <label className="text-xs text-muted">Hora<input type="time" value={it.time ?? ""} onChange={(e) => update(idx, { time: e.target.value || null })} className="field min-h-9 py-1 text-sm" step={300} /></label>
                        <label className="text-xs text-muted">Duração (min)<input type="number" min={5} step={5} value={it.durationMin} onChange={(e) => update(idx, { durationMin: Math.max(5, Number(e.target.value) || s.durationMin) })} className="field min-h-9 py-1 text-sm" /></label>
                        <label className="text-xs text-muted">Preço (R$)<input inputMode="decimal" value={it.price} onChange={(e) => update(idx, { price: e.target.value })} className="field min-h-9 py-1 text-sm" /></label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {items.length > 1 && <p className="mt-3 text-xs text-muted">Dica: o horário com borda dourada começa logo depois do serviço anterior. Serviços com profissionais diferentes podem ser no mesmo horário.</p>}
        </section>
      )}

      {/* 4. Confirmar */}
      {items.length > 0 && (
        <section className="card space-y-3">
          <div className="flex items-center gap-2">{step(4, false)}<h2 className="font-bold">Confirmar</h2></div>
          <ul className="space-y-1 rounded-xl bg-mist px-3 py-2 text-sm">
            <li className="font-semibold">{client?.fullName ?? "Cliente nova"} · <span className="capitalize">{formatLongDate(date)}</span></li>
            {items.map((it) => {
              const s = svcById.get(it.serviceId)!;
              const p = pros.find((x) => x.id === it.proId);
              return (
                <li key={it.serviceId} className="flex justify-between gap-2">
                  <span>{it.time ?? "--:--"} · {s.name} com {p ? (p.nickname ?? p.name) : "—"}</span>
                  <span className="text-muted">R$ {it.price}</span>
                </li>
              );
            })}
            {items.length > 1 && <li className="flex justify-between border-t border-line pt-1 font-semibold"><span>Total previsto</span><span>{formatBRL(total)}</span></li>}
          </ul>
          {!client && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="label">Nome da cliente</span><input name="walkInName" className="field" defaultValue={q.trim().length >= 2 && !/\d/.test(q) ? q.trim() : ""} /></label>
              <label className="text-sm"><span className="label">WhatsApp (cria o cadastro)</span><input name="newClientPhone" inputMode="tel" className="field" placeholder="(51) 9…" /></label>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm sm:col-span-2"><span className="label">Observações</span><input name="notes" className="field" placeholder="Ex.: quer franja, traz a própria tinta…" /></label>
            <label className="text-sm"><span className="label">Origem</span>
              <select name="source" className="field" defaultValue="APP">
                <option value="APP">Pelo salão</option>
                <option value="WALKIN">Chegou sem marcar</option>
                <option value="CAMPAIGN">Veio de campanha</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="force" className="h-4 w-4 accent-brand" /> Encaixar mesmo se houver conflito de horário</label>
          <button type="submit" disabled={!ready || pending} className="btn btn-primary w-full sm:w-auto">
            {pending ? "Agendando…" : ready ? `Confirmar ${items.length > 1 ? `${items.length} serviços` : "agendamento"}` : "Escolha quem atende e o horário de cada serviço"}
          </button>
        </section>
      )}
    </form>
  );
}
