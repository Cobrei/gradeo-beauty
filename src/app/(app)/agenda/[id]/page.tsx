import Link from "next/link";
import { Badge, Card, Field, PageHeader, WaLink } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { getAppointment, waitlistMatches } from "@/modules/agenda/application/use-cases";
import { rescheduleAction, transitionAction } from "@/modules/agenda/ui/actions";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { APPT_STATUS } from "@/modules/agenda/domain/slots";
import { dateToLocal, formatDateTime } from "@/lib/time";
import { formatBRL, toCents } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { can } from "@/lib/context";

export const metadata = { title: "Atendimento" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const [a, settings, pros] = await Promise.all([getAppointment(actor, id), getSettings(actor), listProfessionals(actor)]);
  const ap = a.appt;
  const st = APPT_STATUS[ap.status];
  const l = dateToLocal(ap.startsAt);
  const matches = ap.status === "CANCELLED" ? await waitlistMatches(actor, ap.serviceId, ap.professionalId, l.date) : [];
  const back = `/agenda?d=${l.date}`;
  const name = a.clientName ?? ap.walkInName ?? "Cliente";
  const first = name.split(" ")[0];
  const confirmMsg = `Oi ${first}! Confirmando seu horário no ${settings.salonName}: ${l.date.split("-").reverse().join("/")} às ${l.time}, ${a.serviceName} com ${a.professionalName}. Posso confirmar? 💕`;

  const buttons: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: "Confirmar pedido", cls: "btn-primary" },
    CONFIRMED: { label: "Marcar como confirmado", cls: "btn-secondary" },
    IN_SERVICE: { label: "Iniciar atendimento", cls: "btn-primary" },
    DONE: { label: "Finalizar e abrir comanda", cls: "btn-primary" },
    NO_SHOW: { label: "Faltou", cls: "btn-secondary" },
    CANCELLED: { label: "Cancelar", cls: "btn-ghost" },
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={name} subtitle={`${a.serviceName} · ${formatDateTime(ap.startsAt)} · ${a.professionalName}`} action={<Link href={back} className="btn btn-secondary btn-sm">← Agenda</Link>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone="mist">{formatBRL(toCents(ap.price))}</Badge>
            {ap.source === "ONLINE" && <Badge tone="gold">agendou online</Badge>}
            {ap.source === "CAMPAIGN" && <Badge tone="brand">veio de campanha</Badge>}
          </div>
          {ap.notes && <p className="mb-3 rounded-xl bg-mist px-3 py-2 text-sm">{ap.notes}</p>}
          {can(actor, "agenda.appointment.write") && st.next.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {st.next.map((to) => (
                <form key={to} action={transitionAction}>
                  <input type="hidden" name="id" value={ap.id} />
                  <input type="hidden" name="to" value={to} />
                  <input type="hidden" name="return" value={back} />
                  <button className={`btn ${buttons[to]?.cls ?? "btn-secondary"}`}>{buttons[to]?.label ?? to}</button>
                </form>
              ))}
            </div>
          )}
          {ap.orderId && (
            <p className="mt-3 text-sm">
              Comanda: <Link href={`/comandas/${ap.orderId}`} className="font-semibold text-brand underline">abrir comanda</Link>
            </p>
          )}
          {ap.status === "DONE" && !ap.orderId && can(actor, "pos.order.write") && (
            <Link href={`/comandas/nova?atendimento=${ap.id}`} className="btn btn-primary mt-3">Abrir comanda deste atendimento</Link>
          )}
          {matches.length > 0 && (
            <div className="mt-4 rounded-xl bg-gold-soft p-3">
              <div className="text-sm font-bold">Horário vagou! Na lista de espera para este serviço:</div>
              <ul className="mt-2 space-y-1">
                {matches.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span>{m.clientName} · {formatPhone(m.clientPhone)}</span>
                    <WaLink phone={m.clientPhone} text={`Oi ${m.clientName.split(" ")[0]}! Vagou um horário de ${a.serviceName} dia ${l.date.split("-").reverse().join("/")} às ${l.time} no ${settings.salonName}. Quer?`}>Avisar</WaLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card title="Cliente">
            {ap.clientId ? (
              <>
                <Link href={`/clientes/${ap.clientId}`} className="font-semibold text-brand hover:underline">Ver ficha completa</Link>
                <div className="mt-1 text-sm text-muted">{formatPhone(a.clientPhone)}</div>
                <div className="mt-2 flex flex-col gap-2">
                  <WaLink phone={a.clientPhone} text={confirmMsg}>Pedir confirmação no WhatsApp</WaLink>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Sem cadastro (atendimento avulso).</p>
            )}
          </Card>
          {can(actor, "agenda.appointment.write") && !["DONE", "CANCELLED"].includes(ap.status) && (
            <Card title="Remarcar">
              <Form action={rescheduleAction} submitLabel="Remarcar">
                <input type="hidden" name="id" value={ap.id} />
                <Field label="Data" name="date">
                  <input id="date" name="date" type="date" defaultValue={l.date} className="field" required />
                </Field>
                <Field label="Hora" name="time">
                  <input id="time" name="time" type="time" defaultValue={l.time} className="field" required step={300} />
                </Field>
                <Field label="Profissional" name="professionalId">
                  <select id="professionalId" name="professionalId" className="field" defaultValue={ap.professionalId}>
                    {pros.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              </Form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
