import { Card, Field, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { addBlockAction, removeBlockAction } from "@/modules/agenda/ui/actions";
import { dayAgenda } from "@/modules/agenda/application/use-cases";
import { todayISO } from "@/lib/dates";
import { dateToLocal } from "@/lib/time";

export const metadata = { title: "Bloquear horário" };

export default async function BloqueioPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const [pros, { blocks }] = await Promise.all([listProfessionals(actor), dayAgenda(actor, date)]);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Bloquear horário" subtitle="Almoço, folga, curso, manutenção… o horário some do agendamento online." />
      <Card>
        <Form action={addBlockAction} submitLabel="Bloquear">
          <Field label="Data" name="date">
            <input id="date" name="date" type="date" defaultValue={date} className="field" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Das" name="from">
              <input id="from" name="from" type="time" className="field" required defaultValue="12:00" />
            </Field>
            <Field label="Até" name="to">
              <input id="to" name="to" type="time" className="field" required defaultValue="13:00" />
            </Field>
          </div>
          <Field label="Profissional" name="professionalId">
            <select id="professionalId" name="professionalId" className="field" defaultValue="">
              <option value="">Salão inteiro</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Motivo" name="reason">
            <input id="reason" name="reason" className="field" placeholder="Almoço" />
          </Field>
        </Form>
      </Card>
      {blocks.length > 0 && (
        <Card title={`Bloqueios em ${date.split("-").reverse().join("/")}`} className="mt-4">
          <ul className="divide-y divide-line text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span>
                  {dateToLocal(b.startsAt).time}–{dateToLocal(b.endsAt).time} · {pros.find((p) => p.id === b.professionalId)?.name ?? "Salão"} · {b.reason ?? ""}
                </span>
                <form action={removeBlockAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="date" value={date} />
                  <button className="btn btn-ghost btn-sm">Remover</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
