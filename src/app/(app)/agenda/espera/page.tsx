import Link from "next/link";
import { Badge, Card, EmptyState, Field, PageHeader, WaLink } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { listWaitlist } from "@/modules/agenda/application/use-cases";
import { addToWaitlistAction, waitlistStatusAction } from "@/modules/agenda/ui/actions";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { listServices } from "@/modules/catalog/application/use-cases";
import { clientBrief, listClients } from "@/modules/crm/application/use-cases";
import { todayISO, formatBR } from "@/lib/dates";
import { addDays } from "@/lib/time";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Lista de espera" };

const PERIOD: Record<string, string> = { ANY: "qualquer hora", MORNING: "manhã", AFTERNOON: "tarde", EVENING: "noite" };

export default async function EsperaPage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const settings = await getSettings(actor);
  const [rows, pros, services] = await Promise.all([listWaitlist(actor), listProfessionals(actor), listServices(actor)]);
  const q = sp.q?.trim() ?? "";
  const found = q.length >= 2 ? (await listClients(actor, { q, limit: 6 })).rows : [];
  const chosen = sp.c ? await clientBrief(actor, sp.c) : undefined;
  return (
    <div>
      <PageHeader title="Lista de espera" subtitle="Quando um horário vagar, o sistema mostra quem está esperando." action={<Link href="/agenda" className="btn btn-secondary btn-sm">← Agenda</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState title="Ninguém esperando" hint="Quando uma cliente pedir um horário que não tem, coloque aqui. Ao cancelar um atendimento compatível, ela aparece na hora." />
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/clientes/${r.clientId}`} className="font-semibold hover:underline">{r.clientName}</Link>
                      <div className="text-xs text-muted">
                        {r.serviceName} · {r.professionalName ?? "qualquer profissional"} · {formatBR(r.fromDate)} a {formatBR(r.toDate)} · {PERIOD[r.periodPref]}
                        {r.note && ` · ${r.note}`}
                      </div>
                    </div>
                    <Badge tone="mist">{formatPhone(r.clientPhone)}</Badge>
                    <WaLink phone={r.clientPhone} text={`Oi ${r.clientName.split(" ")[0]}! Apareceu um horário de ${r.serviceName} no ${settings.salonName}. Quer que eu reserve pra você?`}>Avisar</WaLink>
                    <form action={waitlistStatusAction} className="flex gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <button name="status" value="BOOKED" className="btn btn-secondary btn-sm">Agendada</button>
                      <button name="status" value="EXPIRED" className="btn btn-ghost btn-sm">Remover</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card title="Adicionar à espera">
          {!chosen ? (
            <>
              <form action="/agenda/espera" className="flex gap-2">
                <input name="q" defaultValue={q} placeholder="Buscar cliente" className="field" />
                <button className="btn btn-secondary">Buscar</button>
              </form>
              <ul className="mt-2 divide-y divide-line text-sm">
                {found.map((f) => (
                  <li key={f.id}>
                    <Link href={`/agenda/espera?q=${encodeURIComponent(q)}&c=${f.id}`} className="block py-2 font-semibold hover:bg-mist">{f.fullName}</Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Form action={addToWaitlistAction} submitLabel="Colocar na espera">
              <input type="hidden" name="clientId" value={chosen.id} />
              <p className="text-sm">
                <b>{chosen.fullName}</b> · <Link href="/agenda/espera" className="text-brand">trocar</Link>
              </p>
              <Field label="Serviço" name="serviceId">
                <select id="serviceId" name="serviceId" className="field" required>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Profissional" name="professionalId">
                <select id="professionalId" name="professionalId" className="field" defaultValue="">
                  <option value="">Qualquer</option>
                  {pros.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="De" name="fromDate">
                  <input id="fromDate" name="fromDate" type="date" className="field" defaultValue={todayISO()} required />
                </Field>
                <Field label="Até" name="toDate">
                  <input id="toDate" name="toDate" type="date" className="field" defaultValue={addDays(todayISO(), 14)} required />
                </Field>
              </div>
              <Field label="Período" name="periodPref">
                <select id="periodPref" name="periodPref" className="field">
                  {Object.entries(PERIOD).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Observação" name="note">
                <input id="note" name="note" className="field" />
              </Field>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
