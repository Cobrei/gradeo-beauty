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
import { formatPhone } from "@/lib/phone";
import { fromCents, toCents } from "@/lib/money";

export const metadata = { title: "Agendar" };

export default async function NovoAgendamento({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const [pros, services] = await Promise.all([listProfessionals(actor), listServices(actor)]);
  const pro = sp.pro && pros.some((p) => p.id === sp.pro) ? sp.pro : pros[0]?.id;
  const service = sp.s && services.some((s) => s.id === sp.s) ? sp.s : undefined;
  const q = sp.q?.trim() ?? "";
  const results = q.length >= 2 ? (await listClients(actor, { q, limit: 8 })).rows : [];
  const chosen = sp.c ? await clientBrief(actor, sp.c) : undefined;
  const slots = pro && service ? await availableSlots(actor.tenantId, date, pro, service) : [];
  const svc = services.find((s) => s.id === service);
  const base = `/agenda/novo?d=${date}${pro ? `&pro=${pro}` : ""}${service ? `&s=${service}` : ""}${sp.c ? `&c=${sp.c}&cn=${encodeURIComponent(sp.cn ?? "")}` : ""}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo agendamento" subtitle="Escolha a cliente, o serviço, quem atende e o horário." />
      <div className="grid gap-4 md:grid-cols-5">
        <Card title="1. Cliente" className="md:col-span-2">
          {chosen ? (
            <div className="flex items-center gap-3">
              <Avatar name={chosen.fullName} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{chosen.fullName}</div>
                <div className="text-xs text-muted">{formatPhone(chosen.phone)} · {chosen.visitsCount} visitas</div>
              </div>
              <Link href={`/agenda/novo?d=${date}${pro ? `&pro=${pro}` : ""}${service ? `&s=${service}` : ""}`} className="text-sm font-semibold text-brand">trocar</Link>
            </div>
          ) : (
            <>
              <form action="/agenda/novo" className="flex gap-2">
                <input type="hidden" name="d" value={date} />
                {pro && <input type="hidden" name="pro" value={pro} />}
                {service && <input type="hidden" name="s" value={service} />}
                <input name="q" defaultValue={q} placeholder="Nome ou telefone" className="field" autoFocus />
                <button className="btn btn-secondary">Buscar</button>
              </form>
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-line">
                  {results.map((r) => (
                    <li key={r.id}>
                      <Link href={`${base}&c=${r.id}&cn=${encodeURIComponent(r.fullName)}`} className="flex items-center gap-2 py-2 hover:bg-mist">
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
              {q.length >= 2 && results.length === 0 && <p className="mt-2 text-sm text-muted">Ninguém com esse nome. Preencha abaixo para cadastrar na hora.</p>}
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">ou cliente nova / sem cadastro</p>
            </>
          )}
        </Card>

        <Card title="2. Serviço e horário" className="md:col-span-3">
          <Form action={createAppointmentAction} submitLabel="Confirmar agendamento">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="clientId" value={chosen?.id ?? ""} />
            {sp.return && <input type="hidden" name="return" value={sp.return} />}
            {!chosen && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome" name="walkInName">
                  <input id="walkInName" name="walkInName" className="field" defaultValue={q.length >= 2 && results.length === 0 && !/\d/.test(q) ? q : ""} />
                </Field>
                <Field label="WhatsApp (cria o cadastro)" name="newClientPhone">
                  <input id="newClientPhone" name="newClientPhone" inputMode="tel" className="field" placeholder="(51) 9…" />
                </Field>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Serviço" name="serviceId">
                <select id="serviceId" name="serviceId" required className="field" defaultValue={service ?? ""}>
                  <option value="" disabled>Escolha…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMin} min · R$ {fromCents(toCents(s.price))}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profissional" name="professionalId">
                <select id="professionalId" name="professionalId" required className="field" defaultValue={pro ?? ""}>
                  {pros.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data" name="d2">
                <input id="d2" type="date" defaultValue={date} className="field" form="refiltro" name="d" />
              </Field>
              <Field label="Hora" name="time">
                <input id="time" name="time" type="time" required className="field" defaultValue={sp.t ?? slots[0] ?? ""} step={300} />
              </Field>
            </div>
            {pro && service ? (
              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Horários livres {svc ? `(${svc.durationMin} min)` : ""}</div>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum horário livre para essa combinação. Você pode digitar uma hora e marcar &quot;encaixar&quot;.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((t) => (
                      <Link key={t} href={`${base}&t=${t}`} className={`chip ${sp.t === t ? "chip-on" : ""}`}>{t}</Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Escolha serviço e profissional pelo filtro abaixo para ver os horários livres.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Duração (min)" name="durationMin">
                <input id="durationMin" name="durationMin" type="number" min={5} step={5} className="field" defaultValue={svc?.durationMin ?? ""} placeholder="padrão do serviço" />
              </Field>
              <Field label="Preço (R$)" name="price">
                <input id="price" name="price" inputMode="decimal" className="field" defaultValue={svc ? fromCents(toCents(svc.price)) : ""} />
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
              <input type="checkbox" name="force" className="h-4 w-4 accent-[#b8475f]" /> Encaixar mesmo se houver conflito de horário
            </label>
          </Form>
          <form id="refiltro" action="/agenda/novo" className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
            {sp.c && <input type="hidden" name="c" value={sp.c} />}
            {sp.cn && <input type="hidden" name="cn" value={sp.cn} />}
            <label className="text-xs text-muted">
              Serviço
              <select name="s" className="field min-h-9 py-1 text-sm" defaultValue={service ?? ""}>
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted">
              Profissional
              <select name="pro" className="field min-h-9 py-1 text-sm" defaultValue={pro ?? ""}>
                {pros.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-secondary btn-sm">Ver horários livres</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
