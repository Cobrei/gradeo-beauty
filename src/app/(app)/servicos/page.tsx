import { MoneyInput } from "@/components/ui/money-input";
import { assertCan } from "@/lib/context";
import Link from "next/link";
import { Badge, Card, EmptyState, Field, LinkButton, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listServices } from "@/modules/catalog/application/use-cases";
import { saveServiceAction } from "@/modules/catalog/ui/actions";
import { formatBRL, fromCents, toCents } from "@/lib/money";

export const metadata = { title: "Serviços" };

export default async function ServicosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "catalog.service.manage");
  const sp = await searchParams;
  const all = await listServices(actor, { includeInactive: true });
  const editing = sp.editar ? all.find((s) => s.id === sp.editar) : undefined;
  const showForm = !!editing || sp.novo === "1";
  const cats = [...new Set(all.map((s) => s.category))];
  return (
    <div>
      <PageHeader title="Serviços" subtitle="Preço, duração, comissão e o ciclo de retorno que alimenta o CRM." action={<LinkButton href="/servicos?novo=1">+ Serviço</LinkButton>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {all.length === 0 ? (
            <EmptyState title="Nenhum serviço" hint="Cadastre o primeiro ao lado." />
          ) : (
            cats.map((cat) => (
              <Card key={cat} title={cat} className="mb-3 overflow-x-auto p-0 [&>header]:px-4 [&>header]:pt-4">
                <table className="tbl">
                  <tbody>
                    {all.filter((s) => s.category === cat).map((s) => (
                      <tr key={s.id} className={!s.isActive ? "opacity-50" : ""}>
                        <td>
                          <Link href={`/servicos?editar=${s.id}`} className="font-semibold hover:underline">{s.name}</Link>
                          <div className="text-xs text-muted">{s.durationMin} min{s.returnIntervalDays ? ` · retorno ${s.returnIntervalDays} d` : ""}{s.commissionPct != null ? ` · comissão ${Number(s.commissionPct)}%` : ""}{!s.onlineBooking ? " · sem agendamento online" : ""}</div>
                        </td>
                        <td className="text-right font-semibold">{formatBRL(toCents(s.price))}</td>
                        <td className="w-20 text-right">{!s.isActive && <Badge tone="mist">inativo</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))
          )}
        </div>
        {showForm && (
          <Card title={editing ? "Editar serviço" : "Novo serviço"}>
            <Form action={saveServiceAction} submitLabel="Salvar">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Nome" name="name"><input id="name" name="name" className="field" required defaultValue={editing?.name ?? ""} /></Field>
              <Field label="Categoria" name="category"><input id="category" name="category" className="field" list="cats" defaultValue={editing?.category ?? "Geral"} /><datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duração (min)" name="durationMin"><input id="durationMin" name="durationMin" type="number" min={5} step={5} className="field" required defaultValue={editing?.durationMin ?? 60} /></Field>
                <Field label="Preço" name="price"><MoneyInput name="price" required defaultValue={editing ? editing.price : null} /></Field>
                <Field label="Custo de insumo" name="cost"><MoneyInput name="cost" defaultValue={editing ? editing.cost : 0} /></Field>
                <Field label="Comissão % (vazio = da profissional)" name="commissionPct"><input id="commissionPct" name="commissionPct" type="number" min={0} max={100} step="0.5" className="field" defaultValue={editing?.commissionPct != null ? Number(editing.commissionPct) : ""} /></Field>
                <Field label="Ciclo de retorno (dias)" name="returnIntervalDays" hint="Usado para lembrar a cliente de voltar."><input id="returnIntervalDays" name="returnIntervalDays" type="number" min={1} className="field" defaultValue={editing?.returnIntervalDays ?? ""} /></Field>
              </div>
              <Field label="Descrição (aparece no agendamento online)" name="description"><textarea id="description" name="description" rows={2} className="field" defaultValue={editing?.description ?? ""} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="onlineBooking" defaultChecked={editing?.onlineBooking ?? true} className="h-4 w-4 accent-[#b8475f]" /> Disponível no agendamento online</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-[#b8475f]" /> Ativo</label>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
