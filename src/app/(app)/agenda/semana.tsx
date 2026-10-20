import Link from "next/link";
import { agendaRange, type DayAppointment } from "@/modules/agenda/application/use-cases";
import { APPT_STATUS } from "@/modules/agenda/domain/slots";
import type { Actor } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { addDays, dateToLocal, hhmm, minutesOf, weekdayOf } from "@/lib/time";
import { formatBRL, toCents } from "@/lib/money";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Segunda-feira da semana de uma data. */
export function weekStartOf(dateISO: string): string {
  const wd = weekdayOf(dateISO); // 0 = domingo
  return addDays(dateISO, wd === 0 ? -6 : 1 - wd);
}

/** Distribui atendimentos que se sobrepõem em faixas lado a lado (como o Google Agenda). */
function lanes(items: DayAppointment[]) {
  const sorted = [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const out = new Map<string, { lane: number; of: number }>();
  let group: DayAppointment[] = [];
  let groupEnd = 0;
  let laneEnds: number[] = [];
  const flush = () => {
    const of = Math.max(laneEnds.length, 1);
    for (const g of group) out.set(g.id, { lane: out.get(g.id)!.lane, of });
    group = [];
    laneEnds = [];
    groupEnd = 0;
  };
  for (const a of sorted) {
    const s = a.startsAt.getTime();
    const e = a.endsAt.getTime();
    if (group.length && s >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    out.set(a.id, { lane, of: 1 });
    group.push(a);
    groupEnd = Math.max(groupEnd, e);
  }
  flush();
  return out;
}

export async function WeekView({ actor, date, pro }: { actor: Actor; date: string; pro?: string }) {
  const start = weekStartOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { pros, appts: all, blocks, settings } = await agendaRange(actor, start, 7);
  const proFilter = pro && pros.some((p) => p.id === pro) ? pro : null;
  const appts = proFilter ? all.filter((a) => a.professionalId === proFilter) : all;
  const color = new Map(pros.map((p) => [p.id, p.color]));
  const nick = new Map(pros.map((p) => [p.id, p.nickname ?? p.name.split(" ")[0]]));
  const today = todayISO();

  // Grade: do horário mais cedo ao mais tarde da semana (ou 8h–20h)
  const windows = days.map((d) => settings.openingHours[String(weekdayOf(d))]).filter(Boolean) as { open: string; close: string }[];
  const open = windows.length ? Math.min(...windows.map((w) => minutesOf(w.open))) : 8 * 60;
  const close = windows.length ? Math.max(...windows.map((w) => minutesOf(w.close))) : 20 * 60;
  const earliest = Math.min(open, ...appts.map((a) => minutesOf(dateToLocal(a.startsAt).time)));
  const latest = Math.max(close, ...appts.map((a) => Math.min(minutesOf(dateToLocal(a.endsAt).time) || 24 * 60, 24 * 60)));
  const gridStart = Math.floor(earliest / 60) * 60;
  const gridEnd = Math.ceil(latest / 60) * 60;
  const PX = 1.1;
  const height = (gridEnd - gridStart) * PX;
  const hours: number[] = [];
  for (let t = gridStart; t < gridEnd; t += 60) hours.push(t);

  const total = appts.reduce((s, a) => s + toCents(a.price), 0);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ v: "semana", d: date, ...(proFilter ? { pro: proFilter } : {}), ...extra }).toString();
  const [y1, m1, d1] = start.split("-");
  const [, m2, d2] = days[6].split("-");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/agenda?${qs({ d: addDays(start, -7) })}`} className="btn btn-secondary btn-sm" aria-label="Semana anterior">‹</Link>
        <Link href={`/agenda?${qs({ d: today })}`} className="btn btn-secondary btn-sm">Esta semana</Link>
        <Link href={`/agenda?${qs({ d: addDays(start, 7) })}`} className="btn btn-secondary btn-sm" aria-label="Próxima semana">›</Link>
        <span className="text-sm font-semibold text-ink-2">
          {d1}/{m1} a {d2}/{m2}/{y1} · {appts.length} atendimentos · {formatBRL(total)} previstos
        </span>
      </div>

      {pros.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={`/agenda?${new URLSearchParams({ v: "semana", d: date }).toString()}`} className={`chip ${!proFilter ? "chip-on" : ""}`}>Todas</Link>
          {pros.map((p) => (
            <Link key={p.id} href={`/agenda?${new URLSearchParams({ v: "semana", d: date, pro: p.id }).toString()}`} className={`chip gap-1.5 ${proFilter === p.id ? "chip-on" : ""}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.nickname ?? p.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "48px repeat(7, minmax(96px, 1fr))" }}>
          <div className="sticky top-0 z-10 border-b border-line bg-white" />
          {days.map((d) => {
            const isToday = d === today;
            const closed = !settings.openingHours[String(weekdayOf(d))];
            const n = appts.filter((a) => dateToLocal(a.startsAt).date === d).length;
            return (
              <Link key={d} href={`/agenda?d=${d}`} className={`sticky top-0 z-10 border-b border-l border-line px-2 py-2 text-center hover:bg-mist ${isToday ? "bg-brand-soft" : "bg-white"}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? "text-brand" : "text-muted"}`}>{DIAS[weekdayOf(d)]}</div>
                <div className={`text-lg font-extrabold leading-none ${isToday ? "text-brand" : ""}`}>{d.slice(8)}</div>
                <div className="mt-0.5 text-[10px] text-muted">{closed ? "fechado" : `${n} atend.`}</div>
              </Link>
            );
          })}

          <div className="relative" style={{ height }}>
            {hours.map((t) => (
              <div key={t} className="absolute left-0 right-0 border-t border-line/70 pl-1 text-[10px] text-muted" style={{ top: (t - gridStart) * PX }}>
                {hhmm(t)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const dayAppts = appts.filter((a) => dateToLocal(a.startsAt).date === d);
            const lay = lanes(dayAppts);
            const closed = !settings.openingHours[String(weekdayOf(d))];
            const dayBlocks = blocks.filter((b) => dateToLocal(b.startsAt).date <= d && dateToLocal(b.endsAt).date >= d && (!proFilter || !b.professionalId || b.professionalId === proFilter));
            return (
              <div key={d} className={`relative border-l border-line ${closed ? "bg-mist/60" : ""}`} style={{ height }}>
                {hours.map((t) => (
                  <Link
                    key={t}
                    href={`/agenda/novo?d=${d}&t=${hhmm(t)}${proFilter ? `&pro=${proFilter}` : ""}`}
                    className="absolute left-0 right-0 border-t border-line/70 hover:bg-mist/70"
                    style={{ top: (t - gridStart) * PX, height: 60 * PX }}
                    aria-label={`Agendar ${d.split("-").reverse().join("/")} às ${hhmm(t)}`}
                  />
                ))}
                {dayBlocks.map((b) => {
                  const bs = dateToLocal(b.startsAt);
                  const be = dateToLocal(b.endsAt);
                  const s = Math.max(bs.date < d ? gridStart : minutesOf(bs.time), gridStart);
                  const e = Math.min(be.date > d ? gridEnd : minutesOf(be.time), gridEnd);
                  if (e <= s) return null;
                  return (
                    <div key={b.id} className="pointer-events-none absolute left-0.5 right-0.5 rounded bg-[repeating-linear-gradient(45deg,#eee5e9,#eee5e9_5px,#f6f1f3_5px,#f6f1f3_10px)] px-1 text-[10px] font-semibold text-ink-2" style={{ top: (s - gridStart) * PX, height: (e - s) * PX }}>
                      {b.reason ?? "Bloqueado"}
                    </div>
                  );
                })}
                {dayAppts.map((a) => {
                  const s = minutesOf(dateToLocal(a.startsAt).time);
                  const eLocal = dateToLocal(a.endsAt);
                  const e = eLocal.date > d ? gridEnd : minutesOf(eLocal.time);
                  const { lane, of } = lay.get(a.id) ?? { lane: 0, of: 1 };
                  const c = color.get(a.professionalId) ?? "#b8475f";
                  const faded = ["DONE", "NO_SHOW"].includes(a.status);
                  const width = 100 / of;
                  return (
                    <Link
                      key={a.id}
                      href={`/agenda/${a.id}`}
                      title={`${dateToLocal(a.startsAt).time} ${a.clientName} · ${a.serviceName} · ${nick.get(a.professionalId) ?? ""} · ${APPT_STATUS[a.status]?.label ?? ""}`}
                      className={`absolute overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 text-[10px] leading-tight shadow-sm hover:z-20 hover:ring-2 hover:ring-brand/40 ${faded ? "opacity-55" : ""}`}
                      style={{
                        top: (s - gridStart) * PX,
                        height: Math.max((e - s) * PX - 1, 16),
                        left: `calc(${lane * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        borderColor: c,
                        background: a.status === "REQUESTED" ? "#fbf1dc" : `${c}1a`,
                        zIndex: 2 + lane,
                      }}
                    >
                      <div className="truncate font-bold">{dateToLocal(a.startsAt).time} {a.clientName.split(" ")[0]}</div>
                      {(e - s) * PX >= 26 && <div className="truncate text-muted">{a.serviceName}</div>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Toque num dia para abrir a agenda do dia; toque num horário vazio para agendar. Pedidos online aparecem em amarelo.</p>
    </div>
  );
}
