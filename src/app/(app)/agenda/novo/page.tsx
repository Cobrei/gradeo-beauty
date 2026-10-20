import { MoneyInput } from "@/components/ui/money-input";
import Link from "next/link";
import { Avatar, Card, Field, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { listServices } from "@/modules/catalog/application/use-cases";
import { clientBrief, listClients } from "@/modules/crm/application/use-cases";
import { availableSlots } from "@/modules/agenda/application/use-cases";
import { createAppointmentAction } from "@/modules/agenda/ui/actions";
import { todayISO } from "@/lib/dates";
import { addDays, formatLongDate } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { fromCents, toCents, formatBRL } from "@/lib/money";

export const metadata = { title: "Agendar" };

export default async function NovoAgendamento({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const [allPros, services] = await Promise.all([listProfessionals(actor), listServices(actor)]);
  const service = sp.s && services.some((s) => s.id === sp.s) ? sp.s : undefined;
  const svc = services.find((s) => s.id === service);
  // só quem faz o serviço escolhido (lista vazia = faz todos)
  const pros = svc ? allPros.filter((p) => !p.serviceIds.length || p.serviceIds.includes(svc.id)) : allPros;
  const pro = sp.pro && pros.some((p) => p.id === sp.pro) ? sp.pro : pros.length === 1 ? pros[0].id : undefined;
  const proName = pros.find((p) => p.id === pro);
  const q = sp.q?.trim() ?? "";
  const results = q.length >= 2 ? (await listClients(actor, { q, limit: 8 })).rows : [];
  const chosen = sp.c ? await clientBrief(actor, sp.c) : undefined;
  const slots = pro && service ? await availableSlots(actor.tenantId, date, pro, service) : [];
  const time = sp.t && /^\d{2}:\d{2}$/.test(sp.t) ? sp.t : undefined;

  // monta o link mantendo as escolhas anteriores
  const keep: Record<string, string | undefined> = { d: date, s: service, pro, c: sp.c, cn: sp.cn, t: time, return: sp.return };
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...keep, ...over })) if (v) p.set(k, v);
    return `/agenda/novo?${p.toString()}`;
  };
  const stepCls = (done: boolean) => `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${done ? "bg-brand text-white" : "bg-mist text-muted"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Novo agendamento" subtitle="Siga os passos: cliente, serviço, profissional e horário." />

      {/* 1. Cliente */}
      <Card>
        <div className="mb-3 flex items-center gap-2"><span className={stepCls(!!chosen)}>1</span><h2 className="font-bold">Cliente</h2></div>
        {chosen ? (
          <div className="flex items-center gap-3">
            <Avatar name={chosen.fullName} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{chosen.fullName}</div>
              <div className="text-xs text-muted">{formatPhone(chosen.phone)} · {chosen.visitsCount} visitas</div>
            </div>
            <Link href={href({ c: undefined, cn: undefined })} className="text-sm font-semibold text-brand">trocar</Link>
          </div>
        ) : (
          <>
            <form action="/agenda/novo" className="flex gap-2">
              {Object.entries(keep).map(([k, v]) => (v && k !== "c" && k !== "cn" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
              <input name="q" defaultValue={q} placeholder="Buscar por nome ou telefone" className="field" autoFocus={!service} />
              <button className="btn btn-secondary">Buscar</button>
            </form>
            {results.length > 0 && (
              <ul className="mt-2 divide-y divide-line">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link href={href({ c: r.id, cn: r.fullName })} className="flex items-center gap-2 py-2 hover:bg-mist">
                      <Avatar name={r.fullName} size={32} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{r.fullName}</div>
                        <div className="text-xs text-muted">{formatPhone(r.phone)} · {r.visitsCount} visitas</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">{q.length >= 2 && results.length === 0 ? "Ninguém com esse nome. " : ""}Cliente nova? Siga em frente: você coloca o nome e o WhatsApp no último passo.</p>
          </>
        )}
      </Card>

      {/* 2. Serviço */}
      <Card>
        <div className="mb-3 flex items-center gap-2"><span className={stepCls(!!svc)}>2</span><h2 className="font-bold">Serviço</h2></div>
        {svc ? (
          <div className="flex items-center justify-between gap-3">
            <div><div className="font-semibold">{svc.name}</div><div className="text-xs text-muted">{svc.durationMin} min · {formatBRL(toCents(svc.price))}</div></div>
            <Link href={href({ s: undefined, pro: undefined, t: undefined })} className="text-sm font-semibold text-brand">trocar</Link>
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted">Nenhum serviço cadastrado. <Link href="/servicos" className="font-semibold text-brand underline">Cadastre em Serviços</Link>.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <Link key={s.id} href={href({ s: s.id, pro: undefined, t: undefined })} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm hover:border-brand hover:bg-brand-soft">
                <span className="font-semibold">{s.name}</span>
                <span className="text-xs text-muted">{s.durationMin} min · {formatBRL(toCents(s.price))}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Profissional */}
      {svc && (
        <Card>
          <div className="mb-3 flex items-center gap-2"><span className={stepCls(!!pro)}>3</span><h2 className="font-bold">Quem vai atender</h2></div>
          {pros.length === 0 ? (
            <p className="text-sm text-muted">Ninguém da equipe está marcado para fazer {svc.name}. <Link href="/equipe" className="font-semibold text-brand underline">Ajuste em Equipe</Link>.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pros.map((p) => (
                <Link key={p.id} href={href({ pro: p.id, t: undefined })} className={`chip gap-2 px-4 py-2 text-sm ${pro === p.id ? "chip-on" : ""}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  {p.nickname ?? p.name}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. Dia e horário */}
      {svc && pro && (
        <Card>
          <div className="mb-3 flex items-center gap-2"><span className={stepCls(!!time)}>4</span><h2 className="font-bold">Dia e horário</h2></div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link href={href({ d: addDays(date, -1), t: undefined })} className="btn btn-secondary btn-sm" aria-label="Dia anterior">‹</Link>
            <span className="min-w-40 text-center text-sm font-semibold capitalize">{formatLongDate(date)}</span>
            <Link href={href({ d: addDays(date, 1), t: undefined })} className="btn btn-secondary btn-sm" aria-label="Próximo dia">›</Link>
            <form action="/agenda/novo" className="flex gap-1">
              {Object.entries(keep).map(([k, v]) => (v && k !== "d" && k !== "t" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
              <input type="date" name="d" defaultValue={date} className="field min-h-9 py-1 text-sm" />
              <button className="btn btn-secondary btn-sm">Ir</button>
            </form>
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-muted">Sem horário livre com {proName?.nickname ?? proName?.name} neste dia. Troque o dia, outra profissional, ou digite uma hora no próximo passo e marque &quot;encaixar&quot;.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((t) => (
                <Link key={t} href={href({ t })} className={`chip ${time === t ? "chip-on" : ""}`}>{t}</Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. Confirmar */}
      {svc && pro && (
        <Card>
          <div className="mb-3 flex items-center gap-2"><span className={stepCls(false)}>5</span><h2 className="font-bold">Confirmar</h2></div>
          <Form action={createAppointmentAction} submitLabel="Confirmar agendamento">
            <input type="hidden" name="clientId" value={chosen?.id ?? ""} />
            <input type="hidden" name="serviceId" value={svc.id} />
            <input type="hidden" name="professionalId" value={pro} />
            <input type="hidden" name="date" value={date} />
            {sp.return && <input type="hidden" name="return" value={sp.return} />}
            <p className="rounded-xl bg-mist px-3 py-2 text-sm">
              <b>{chosen?.fullName ?? "Cliente"}</b> · {svc.name} com <b>{proName?.nickname ?? proName?.name}</b> · <span className="capitalize">{formatLongDate(date)}</span>{time ? <> às <b>{time}</b></> : ""}
            </p>
            {!chosen && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome da cliente" name="walkInName">
                  <input id="walkInName" name="walkInName" className="field" defaultValue={q.length >= 2 && results.length === 0 && !/\d/.test(q) ? q : ""} />
                </Field>
                <Field label="WhatsApp (cria o cadastro)" name="newClientPhone">
                  <input id="newClientPhone" name="newClientPhone" inputMode="tel" className="field" placeholder="(51) 9…" />
                </Field>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Hora" name="time">
                <input id="time" name="time" type="time" required className="field" defaultValue={time ?? ""} step={300} />
              </Field>
              <Field label="Duração (min)" name="durationMin">
                <input id="durationMin" name="durationMin" type="number" min={5} step={5} className="field" defaultValue={svc.durationMin} />
              </Field>
              <Field label="Preço" name="price">
                <MoneyInput name="price" defaultValue={svc.price} />
              </Field>
              <Field label="Origem" name="source">
                <select id="source" name="source" className="field" defaultValue="APP">
                  <option value="APP">Pelo salão</option>
                  <option value="WALKIN">Chegou sem marcar</option>
                  <option value="CAMPAIGN">Veio de campanha</option>
                </select>
              </Field>
            </div>
            <Field label="Observações" name="notes">
              <input id="notes" name="notes" className="field" placeholder="Ex.: quer franja, traz a própria tinta…" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="force" className="h-4 w-4 accent-brand" /> Encaixar mesmo se houver conflito de horário
            </label>
          </Form>
        </Card>
      )}
    </div>
  );
}
