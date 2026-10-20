import Link from "next/link";
import { Avatar, Badge, Card, Field, LinkButton, PageHeader, Stat, Tabs, WaLink } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { getClient } from "@/modules/crm/application/use-cases";
import { nextAppointments } from "@/modules/agenda/application/use-cases";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { listServices } from "@/modules/catalog/application/use-cases";
import { addNoteAction, optOutAction } from "@/modules/crm/ui/actions";
import { ClientForm } from "@/modules/crm/ui/client-form";
import { APPT_STATUS } from "@/modules/agenda/domain/slots";
import { can } from "@/lib/context";
import { formatBRL, toCents } from "@/lib/money";
import { daysBetween, formatBR, todayISO } from "@/lib/dates";
import { formatDateTime } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { createVoucherAction } from "@/modules/marketing/ui/actions";
import { addDays } from "@/lib/time";

export const metadata = { title: "Cliente" };

const NOTE_KIND: Record<string, { label: string; tone: "brand" | "bad" | "info" | "mist" }> = {
  FORMULA: { label: "Fórmula", tone: "brand" },
  ALLERGY: { label: "Alergia / cuidado", tone: "bad" },
  PREFERENCE: { label: "Preferência", tone: "info" },
  NOTE: { label: "Nota", tone: "mist" },
};

export default async function ClientePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const { aba = "historico" } = await searchParams;
  const actor = await requireActor();
  const [data, settings, next, pros, services] = await Promise.all([getClient(actor, id), getSettings(actor), nextAppointments(actor, id), listProfessionals(actor), listServices(actor)]);
  const c = data.client;
  const today = todayISO();
  const days = c.lastVisitAt ? daysBetween(c.lastVisitAt, today) : null;
  const first = c.fullName.split(" ")[0];
  const alerts = data.notes.filter((n) => n.kind === "ALLERGY");
  const formulas = data.notes.filter((n) => n.kind === "FORMULA");
  const timeline = [
    ...data.orders.map((o) => ({ key: `o${o.id}`, sortKey: `${o.serviceDate}T23:59`, date: o.serviceDate, kind: "order" as const, o })),
    ...data.appointments.filter((a) => a.status !== "DONE").map((a) => ({ key: `a${a.id}`, sortKey: a.startsAt.toISOString(), date: formatDateTime(a.startsAt), kind: "appt" as const, a })),
  ].sort((x, y) => (x.sortKey < y.sortKey ? 1 : -1));
  const inviteMsg = `Oi ${first}! Sentimos sua falta no ${settings.salonName} 💕 Que tal marcar um horário essa semana? Me diz o melhor dia que eu reservo pra você.`;

  return (
    <div>
      <PageHeader
        title={c.fullName}
        subtitle={
          <>
            {formatPhone(c.phone)}{c.email ? ` · ${c.email}` : ""}{c.birthDate ? ` · nasc. ${formatBR(c.birthDate)}` : ""}
            {data.preferredName ? ` · prefere ${data.preferredName}` : ""}
          </>
        }
        action={
          <>
            <WaLink phone={c.phone} text={days && days > 30 ? inviteMsg : `Oi ${first}! Aqui é do ${settings.salonName} 💕`} className="btn btn-wa">WhatsApp</WaLink>
            {can(actor, "agenda.appointment.write") && <LinkButton href={`/agenda/novo?c=${c.id}&cn=${encodeURIComponent(c.fullName)}`}>Agendar</LinkButton>}
            {can(actor, "pos.order.write") && <LinkButton href={`/comandas/nova?cliente=${c.id}`} variant="secondary">Comanda</LinkButton>}
          </>
        }
      />
      {alerts.length > 0 && (
        <div className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          ⚠ {alerts.map((a) => a.text).join(" · ")}
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Visitas" value={c.visitsCount} tone="info" />
        <Stat label="Total gasto" value={formatBRL(toCents(c.totalSpent))} tone="ok" />
        <Stat label="Ticket médio" value={c.visitsCount ? formatBRL(Math.round(toCents(c.totalSpent) / c.visitsCount)) : "—"} tone="gold" />
        <Stat label="Última visita" value={c.lastVisitAt ? `${days} d` : "—"} hint={c.lastVisitAt ? formatBR(c.lastVisitAt) : "ainda não veio"} tone={days !== null && days > 45 ? "bad" : "mist"} />
        <Stat label="Ritmo" value={c.avgIntervalDays ? `${c.avgIntervalDays} d` : "—"} hint={c.avgIntervalDays && c.lastVisitAt ? `próxima ≈ ${formatBR(addDays(c.lastVisitAt, c.avgIntervalDays))}` : "entre visitas"} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs
            current={aba}
            items={[
              { key: "historico", label: "Histórico", href: `/clientes/${id}?aba=historico`, count: data.orders.length },
              { key: "ficha", label: "Ficha técnica", href: `/clientes/${id}?aba=ficha`, count: data.notes.length },
              { key: "mensagens", label: "Mensagens", href: `/clientes/${id}?aba=mensagens`, count: data.messages.length },
              { key: "dados", label: "Dados", href: `/clientes/${id}?aba=dados` },
            ]}
          />
          {aba === "historico" && (
            <Card>
              {next.length > 0 && (
                <div className="mb-3 rounded-xl bg-info-soft px-3 py-2 text-sm">
                  <b>Próximos:</b>{" "}
                  {next.map((n) => (
                    <Link key={n.id} href={`/agenda/${n.id}`} className="mr-3 underline">
                      {formatDateTime(n.startsAt)} · {n.serviceName}
                    </Link>
                  ))}
                </div>
              )}
              {data.topServices.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {data.topServices.map((t) => (
                    <Badge key={t.description} tone="mist">{t.description} ×{t.n}</Badge>
                  ))}
                </div>
              )}
              {timeline.length === 0 ? (
                <p className="text-sm text-muted">Nenhum atendimento registrado ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {timeline.map((t) =>
                    t.kind === "order" ? (
                      <li key={t.key} className="flex items-center gap-3 py-2.5">
                        <div className="w-24 shrink-0 text-sm text-muted">{formatBR(t.o.serviceDate)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{t.o.items ?? "Comanda"}</div>
                          <div className="text-xs text-muted">Comanda #{t.o.number}</div>
                        </div>
                        <Badge tone={t.o.status === "PAID" ? "ok" : t.o.status === "OPEN" ? "warn" : "mist"}>{t.o.status === "PAID" ? "paga" : t.o.status === "OPEN" ? "aberta" : "cancelada"}</Badge>
                        <Link href={`/comandas/${t.o.id}`} className="w-24 text-right font-semibold hover:underline">{formatBRL(toCents(t.o.total))}</Link>
                      </li>
                    ) : (
                      <li key={t.key} className="flex items-center gap-3 py-2.5 opacity-80">
                        <div className="w-24 shrink-0 text-sm text-muted">{t.date.slice(0, 5)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{t.a.serviceName}</div>
                          <div className="text-xs text-muted">{t.a.professionalName}</div>
                        </div>
                        <Badge tone={APPT_STATUS[t.a.status].tone}>{APPT_STATUS[t.a.status].label}</Badge>
                        <Link href={`/agenda/${t.a.id}`} className="w-24 text-right text-sm text-brand">abrir</Link>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </Card>
          )}
          {aba === "ficha" && (
            <div className="space-y-4">
              {formulas.length > 0 && (
                <Card title="Última fórmula">
                  <p className="whitespace-pre-wrap text-sm">{formulas[0].text}</p>
                  <p className="mt-1 text-xs text-muted">{formatBR(formulas[0].noteDate)}{formulas[0].serviceName ? ` · ${formulas[0].serviceName}` : ""}{formulas[0].professionalName ? ` · ${formulas[0].professionalName}` : ""}</p>
                </Card>
              )}
              {can(actor, "crm.note.write") && (
                <Card title="Registrar">
                  <Form action={addNoteAction} submitLabel="Salvar na ficha">
                    <input type="hidden" name="clientId" value={c.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Tipo" name="kind">
                        <select id="kind" name="kind" className="field" defaultValue="FORMULA">
                          {Object.entries(NOTE_KIND).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Serviço" name="serviceId">
                        <select id="serviceId" name="serviceId" className="field" defaultValue="">
                          <option value="">—</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Profissional" name="professionalId">
                        <select id="professionalId" name="professionalId" className="field" defaultValue="">
                          <option value="">—</option>
                          {pros.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Texto" name="text" hint="Ex.: 7.1 + 8.1 (1:1) ox 20 vol, 35 min · raiz 6.0 · tonalizante 9.1">
                      <textarea id="text" name="text" rows={3} className="field" required />
                    </Field>
                  </Form>
                </Card>
              )}
              <Card title="Tudo que já foi anotado">
                {data.notes.length === 0 ? (
                  <p className="text-sm text-muted">Nada ainda. A próxima profissional que atender agradece.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.notes.map((n) => (
                      <li key={n.id} className="py-2.5">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Badge tone={NOTE_KIND[n.kind].tone}>{NOTE_KIND[n.kind].label}</Badge>
                          {formatBR(n.noteDate)}{n.serviceName ? ` · ${n.serviceName}` : ""}{n.professionalName ? ` · ${n.professionalName}` : ""}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{n.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
          {aba === "mensagens" && (
            <Card>
              {data.messages.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma mensagem enviada ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.messages.map((m) => (
                    <li key={m.id} className="py-2.5">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Badge tone={m.status === "SENT" ? "ok" : m.status === "FAILED" ? "bad" : "warn"}>{m.status === "SENT" ? "enviada" : m.status === "FAILED" ? "falhou" : "na fila"}</Badge>
                        {formatDateTime(m.createdAt)} · {m.automationKind ? `automação ${m.automationKind.toLowerCase()}` : m.campaignId ? <Link href={`/campanhas/${m.campaignId}`} className="underline">campanha</Link> : ""}
                      </div>
                      <p className="mt-1 text-sm">{m.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {aba === "dados" && (
            <Card>
              {can(actor, "crm.client.write") ? <ClientForm client={c} professionals={pros} /> : <p className="text-sm text-muted">Sem permissão para editar.</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Resumo">
            <div className="flex items-center gap-3">
              <Avatar name={c.fullName} size={48} />
              <div className="text-sm">
                <div>Cliente desde {formatBR(c.firstVisitAt ?? c.createdAt.toISOString().slice(0, 10))}</div>
                <div className="text-muted">Origem: {c.source.toLowerCase()}</div>
                {c.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} tone="gold">{t}</Badge>)}</div>}
              </div>
            </div>
            {c.notes && <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm">{c.notes}</p>}
            <form action={optOutAction} className="mt-3">
              <input type="hidden" name="clientId" value={c.id} />
              <input type="hidden" name="optOut" value={c.marketingOptOut ? "0" : "1"} />
              <button className="text-xs font-semibold text-muted underline">{c.marketingOptOut ? "Voltar a enviar mensagens" : "Não enviar mais mensagens (opt-out)"}</button>
            </form>
          </Card>
          {(data.credits.length > 0 || data.vouchers.length > 0) && (
            <Card title="Créditos e vouchers">
              <ul className="space-y-1 text-sm">
                {data.credits.map((cr) => (
                  <li key={cr.id} className="flex justify-between">
                    <span>{cr.serviceName}</span>
                    <span className="font-semibold">{cr.remaining}/{cr.total} <span className="text-xs text-muted">até {formatBR(cr.expiresAt)}</span></span>
                  </li>
                ))}
                {data.vouchers.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <span>
                      <code className="rounded bg-gold-soft px-1">{v.code}</code> {v.kind === "PERCENT" ? `${Number(v.value)}%` : formatBRL(toCents(v.value))}
                    </span>
                    <span className="text-xs text-muted">até {formatBR(v.validUntil)}{v.uses >= v.maxUses ? " · usado" : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {can(actor, "mkt.voucher.manage") && (
            <Card title="Dar um voucher">
              <Form action={createVoucherAction} submitLabel="Criar e enviar">
                <input type="hidden" name="clientId" value={c.id} />
                <input type="hidden" name="name" value={`Voucher pessoal · ${first}`} />
                <input type="hidden" name="return" value={`/clientes/${c.id}`} />
                <input type="hidden" name="validFrom" value={today} />
                <input type="hidden" name="maxUses" value="1" />
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Tipo" name="kind">
                    <select id="kind" name="kind" className="field" defaultValue="PERCENT">
                      <option value="PERCENT">%</option>
                      <option value="AMOUNT">R$</option>
                    </select>
                  </Field>
                  <Field label="Valor" name="value">
                    <input id="value" name="value" inputMode="decimal" className="field" defaultValue="15" required />
                  </Field>
                  <Field label="Até" name="validUntil">
                    <input id="validUntil" name="validUntil" type="date" className="field" defaultValue={addDays(today, 30)} required />
                  </Field>
                </div>
              </Form>
              <p className="mt-2 text-xs text-muted">O código aparece acima; mande pelo WhatsApp.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
