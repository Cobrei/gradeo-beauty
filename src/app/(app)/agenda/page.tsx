import Link from "next/link";
import { Badge, LinkButton, Notice, PageHeader } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { dayAgenda } from "@/modules/agenda/application/use-cases";
import { APPT_STATUS } from "@/modules/agenda/domain/slots";
import { can } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { addDays, dateToLocal, formatLongDate, hhmm, minutesOf } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { toCents } from "@/lib/money";
import { WeekView } from "./semana";
import { ScrollToNow } from "./scroll-to-now";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ d?: string; aviso?: string; erro?: string; v?: string; pro?: string; ocultar?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const toggle = (
    <div className="inline-flex rounded-xl bg-mist p-1" role="tablist" aria-label="Visão da agenda">
      <Link href={`/agenda?d=${date}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sp.v !== "semana" ? "bg-white text-ink shadow-sm" : "text-ink-2"}`}>Dia</Link>
      <Link href={`/agenda?v=semana&d=${date}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sp.v === "semana" ? "bg-white text-ink shadow-sm" : "text-ink-2"}`}>Semana</Link>
    </div>
  );
  if (sp.v === "semana") {
    return (
      <div>
        <PageHeader
          title="Agenda da semana"
          action={
            <>
              {toggle}
              {can(actor, "agenda.appointment.write") && <LinkButton href={`/agenda/novo?d=${date}`}>+ Agendar</LinkButton>}
              {can(actor, "agenda.block.write") && <LinkButton href={`/agenda/bloqueio?d=${date}`} variant="secondary">Bloquear</LinkButton>}
            </>
          }
        />
        <WeekView actor={actor} date={date} pro={sp.pro} />
      </div>
    );
  }
  const { pros, appts, blocks, salonWindow } = await dayAgenda(actor, date);

  // Grade: do início ao fim do expediente (ou 8h–20h), em passos de 30 min.
  const open = salonWindow ? minutesOf(salonWindow.open) : 8 * 60;
  const close = salonWindow ? minutesOf(salonWindow.close) : 20 * 60;
  const earliest = Math.min(open, ...appts.map((a) => minutesOf(dateToLocal(a.startsAt).time)));
  const latest = Math.max(close, ...appts.map((a) => minutesOf(dateToLocal(a.endsAt).time)));
  const gridStart = Math.floor(earliest / 30) * 30;
  const gridEnd = Math.ceil(latest / 30) * 30;
  const PX_PER_MIN = 1.6;
  const height = (gridEnd - gridStart) * PX_PER_MIN;
  const hours: number[] = [];
  for (let t = gridStart; t < gridEnd; t += 30) hours.push(t);
  // o que já passou fica discreto; o que vem pela frente ganha destaque
  const today = todayISO();
  const nowLocal = dateToLocal(new Date());
  const nowMin = minutesOf(nowLocal.time);
  const isPast = (a: (typeof appts)[number]) =>
    ["DONE", "NO_SHOW", "CANCELLED"].includes(a.status) || date < today || (date === today && a.status !== "IN_SERVICE" && minutesOf(dateToLocal(a.endsAt).time) <= nowMin);
  const hidePast = sp.ocultar === "1";
  const pastCount = appts.filter(isPast).length;
  const showNow = date === today && nowMin >= gridStart && nowMin <= gridEnd;
  const totalDay = appts.filter((a) => a.status !== "CANCELLED").reduce((s, a) => s + toCents(a.price), 0);

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={<span className="capitalize">{formatLongDate(date)}</span>}
        action={
          <>
            {toggle}
            <Link href={`/agenda?d=${addDays(date, -1)}`} className="btn btn-secondary btn-sm" aria-label="Dia anterior">‹</Link>
            <Link href={`/agenda?d=${todayISO()}`} className="btn btn-secondary btn-sm">Hoje</Link>
            <Link href={`/agenda?d=${addDays(date, 1)}`} className="btn btn-secondary btn-sm" aria-label="Próximo dia">›</Link>
            <form action="/agenda" className="inline-flex gap-1">
              <input type="date" name="d" defaultValue={date} className="field min-h-9 py-1 text-sm" />
              <button className="btn btn-secondary btn-sm">Ir</button>
            </form>
            {can(actor, "agenda.appointment.write") && <LinkButton href={`/agenda/novo?d=${date}`}>+ Agendar</LinkButton>}
            {can(actor, "agenda.block.write") && <LinkButton href={`/agenda/bloqueio?d=${date}`} variant="secondary">Bloquear</LinkButton>}
            <LinkButton href="/agenda/espera" variant="ghost">Lista de espera</LinkButton>
          </>
        }
      />
      {sp.aviso === "encaixe" && <div className="mb-3"><Notice tone="warn">Encaixe feito por cima de outro atendimento. Confira a coluna da profissional.</Notice></div>}
      {sp.erro && <div className="mb-3"><Notice tone="bad">{sp.erro}</Notice></div>}
      {!salonWindow && <div className="mb-3"><Notice tone="mist">O salão não abre neste dia (horário em Configurações).</Notice></div>}

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Badge tone="mist">{appts.length} atendimentos</Badge>
        <Badge tone="ok">{formatBRL(totalDay)} previstos</Badge>
        {pastCount > 0 && (
          <Link href={`/agenda?d=${date}${hidePast ? "" : "&ocultar=1"}`} className="chip">
            {hidePast ? `Mostrar os ${pastCount} que já passaram` : `Esconder os ${pastCount} que já passaram`}
          </Link>
        )}
        {appts.filter((a) => a.status === "REQUESTED").length > 0 && <Badge tone="gold">{appts.filter((a) => a.status === "REQUESTED").length} pedidos online para confirmar</Badge>}
      </div>

      {date === today && <ScrollToNow />}
      {pros.length === 0 ? (
        <Notice tone="warn">Cadastre uma profissional em Equipe para a agenda aparecer.</Notice>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${pros.length}, minmax(180px, 1fr))` }}>
            <div className="sticky top-0 z-10 border-b border-line bg-white" />
            {pros.map((p) => (
              <div key={p.id} className="sticky top-0 z-10 flex items-center gap-2 border-b border-l border-line bg-white px-3 py-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="truncate text-sm font-bold">{p.nickname ?? p.name}</span>
                <span className="ml-auto text-xs text-muted">{appts.filter((a) => a.professionalId === p.id).length}</span>
              </div>
            ))}
            {/* horas */}
            <div className="relative" style={{ height }}>
              {hours.map((t) => (
                <div key={t} className="absolute left-0 right-0 border-t border-line/70 pl-1 text-[11px] text-muted" style={{ top: (t - gridStart) * PX_PER_MIN }}>
                  {t % 60 === 0 ? hhmm(t) : ""}
                </div>
              ))}
            </div>
            {pros.map((p) => {
              const mine = appts.filter((a) => a.professionalId === p.id && !(hidePast && isPast(a)));
              const myBlocks = blocks.filter((b) => !b.professionalId || b.professionalId === p.id);
              return (
                <div key={p.id} className="relative border-l border-line" style={{ height }}>
                  {hours.map((t) => (
                    <Link key={t} href={`/agenda/novo?d=${date}&pro=${p.id}&t=${hhmm(t)}`} className="absolute left-0 right-0 border-t border-line/70 hover:bg-mist/60" style={{ top: (t - gridStart) * PX_PER_MIN, height: 30 * PX_PER_MIN }} aria-label={`Agendar ${hhmm(t)} com ${p.name}`} />
                  ))}
                  {myBlocks.map((b) => {
                    const s = Math.max(minutesOf(dateToLocal(b.startsAt).time), gridStart);
                    const e = Math.min(dateToLocal(b.endsAt).date > date ? gridEnd : minutesOf(dateToLocal(b.endsAt).time), gridEnd);
                    return (
                      <div key={b.id} className="absolute left-1 right-1 rounded-lg bg-[repeating-linear-gradient(45deg,#eee5e9,#eee5e9_6px,#f6f1f3_6px,#f6f1f3_12px)] px-2 py-1 text-[11px] font-semibold text-ink-2" style={{ top: (s - gridStart) * PX_PER_MIN, height: Math.max((e - s) * PX_PER_MIN, 18) }}>
                        {b.reason ?? "Bloqueado"}
                      </div>
                    );
                  })}
                  {showNow && (
                    <div id="agora" className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-bad" style={{ top: (nowMin - gridStart) * PX_PER_MIN }}>
                      <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-bad" />
                    </div>
                  )}
                  {mine.map((a, i) => {
                    const s = minutesOf(dateToLocal(a.startsAt).time);
                    const e = minutesOf(dateToLocal(a.endsAt).time);
                    const st = APPT_STATUS[a.status];
                    const overlapIdx = mine.filter((o, j) => j < i && o.startsAt < a.endsAt && o.endsAt > a.startsAt).length;
                    const past = isPast(a);
                    if (past) {
                      return (
                        <Link
                          key={a.id}
                          href={`/agenda/${a.id}`}
                          title={`${dateToLocal(a.startsAt).time} ${a.clientName} · ${a.serviceName} · ${st.label}`}
                          className="absolute flex items-center gap-1 overflow-hidden rounded-md border border-dashed border-line bg-mist/70 px-2 text-[11px] text-muted hover:opacity-100 hover:ring-2 hover:ring-brand/30"
                          style={{ top: (s - gridStart) * PX_PER_MIN, height: Math.min(Math.max((e - s) * PX_PER_MIN - 2, 20), 24), left: 4 + overlapIdx * 14, right: 4, zIndex: 1 + overlapIdx, opacity: 0.75 }}
                        >
                          <span className="font-semibold">{dateToLocal(a.startsAt).time}</span>
                          <span className="truncate">{a.clientName}</span>
                          <span className="ml-auto shrink-0">{a.status === "DONE" ? "✓" : a.status === "NO_SHOW" ? "faltou" : a.status === "CANCELLED" ? "cancelado" : ""}</span>
                        </Link>
                      );
                    }
                    return (
                      <Link
                        key={a.id}
                        href={`/agenda/${a.id}`}
                        className="absolute overflow-hidden rounded-lg border-l-[6px] px-2.5 py-1.5 text-xs shadow-md ring-1 ring-black/5 hover:ring-2 hover:ring-brand/40"
                        style={{ top: (s - gridStart) * PX_PER_MIN, height: Math.max((e - s) * PX_PER_MIN - 2, 26), left: 4 + overlapIdx * 14, right: 4, borderColor: p.color, background: a.status === "REQUESTED" ? "#fbf1dc" : a.status === "IN_SERVICE" ? "#f8e4e9" : "#fff", zIndex: 5 + overlapIdx }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold tabular-nums">{dateToLocal(a.startsAt).time}</span>
                          <span className="truncate text-[13px] font-bold">{a.clientName}</span>
                          {a.visitsCount === 0 && <span className="rounded bg-gold-soft px-1 text-[10px] font-semibold text-[#8a6420]">1ª vez</span>}
                        </div>
                        <div className="truncate text-ink-2">{a.serviceName}</div>
                        {e - s >= 45 && <div className="mt-0.5 text-[10px] font-semibold" style={{ color: st.tone === "mist" ? "#8e8391" : undefined }}>{st.label}</div>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
