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

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ d?: string; aviso?: string; erro?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
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
  const totalDay = appts.filter((a) => a.status !== "CANCELLED").reduce((s, a) => s + toCents(a.price), 0);

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={<span className="capitalize">{formatLongDate(date)}</span>}
        action={
          <>
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
        {appts.filter((a) => a.status === "REQUESTED").length > 0 && <Badge tone="gold">{appts.filter((a) => a.status === "REQUESTED").length} pedidos online para confirmar</Badge>}
      </div>

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
              const mine = appts.filter((a) => a.professionalId === p.id);
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
                  {mine.map((a, i) => {
                    const s = minutesOf(dateToLocal(a.startsAt).time);
                    const e = minutesOf(dateToLocal(a.endsAt).time);
                    const st = APPT_STATUS[a.status];
                    const overlapIdx = mine.filter((o, j) => j < i && o.startsAt < a.endsAt && o.endsAt > a.startsAt).length;
                    const faded = ["DONE", "NO_SHOW"].includes(a.status);
                    return (
                      <Link
                        key={a.id}
                        href={`/agenda/${a.id}`}
                        className={`absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-xs shadow-sm hover:ring-2 hover:ring-brand/40 ${faded ? "opacity-55" : ""}`}
                        style={{ top: (s - gridStart) * PX_PER_MIN, height: Math.max((e - s) * PX_PER_MIN - 2, 22), left: 4 + overlapIdx * 14, right: 4, borderColor: p.color, background: a.status === "REQUESTED" ? "#fbf1dc" : a.status === "IN_SERVICE" ? "#f8e4e9" : "#fff", zIndex: 1 + overlapIdx }}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <span className="truncate">{a.clientName}</span>
                          {a.visitsCount === 0 && <span className="rounded bg-gold-soft px-1 text-[10px] text-[#8a6420]">1ª</span>}
                        </div>
                        <div className="truncate text-muted">
                          {dateToLocal(a.startsAt).time} · {a.serviceName}
                        </div>
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
