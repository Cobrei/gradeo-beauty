import { MoneyInput } from "@/components/ui/money-input";
import { assertCan } from "@/lib/context";
import Link from "next/link";
import { Badge, Card, EmptyState, Field, LinkButton, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listServices } from "@/modules/catalog/application/use-cases";
import { bulkServicesAction, saveServiceAction } from "@/modules/catalog/ui/actions";
import { Notice } from "@/components/ui";
import { formatBRL, fromCents, toCents } from "@/lib/money";

export const metadata = { title: "Serviços" };

export default async function ServicosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string; precos?: string; salvo?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "catalog.service.manage");
  const sp = await searchParams;
  const all = await listServices(actor, { includeInactive: true });
  const editing = sp.editar ? all.find((s) => s.id === sp.editar) : undefined;
  const showForm = !!editing || sp.novo === "1";
  const cats = [...new Set(all.map((s) => s.category))];
  return (
    <div>
      <PageHeader title="Serviços" subtitle="Toque em um serviço para editar preço, duração, comissão e ciclo de retorno." action={<><LinkButton href="/servicos?precos=1" variant="secondary">Editar preços e tempos</LinkButton><LinkButton href="/servicos?novo=1">+ Serviço</LinkButton></>} />
      {sp.salvo && <div className="mb-3"><Notice tone="ok">Preços e tempos atualizados.</Notice></div>}
      {sp.precos === "1" && all.length > 0 && (
        <Card title="Editar preços e tempos" className="mb-4">
          <Form action={bulkServicesAction} submitLabel="Salvar todos">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Serviço</th><th className="w-36">Duração (min)</th><th className="w-40">Preço</th></tr></thead>
                <tbody>
                  {all.filter((s) => s.isActive).map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name}<div className="text-xs font-normal text-muted">{s.category}</div><input type="hidden" name="id" value={s.id} /></td>
                      <td><input name={`dur_${s.id}`} type="number" min={5} max={600} step={5} defaultValue={s.durationMin} className="field min-h-10 py-1" /></td>
                      <td><MoneyInput name={`price_${s.id}`} defaultValue={s.price} className="field min-h-10 py-1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/servicos" className="ml-3 text-sm text-muted underline">Cancelar</Link>
          </Form>
        </Card>
      )}
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
                      <tr key={s.id} className={`${!s.isActive ? "opacity-50" : ""} ${editing?.id === s.id ? "bg-brand-soft/60" : ""}`}>
                        <td>
                          <Link href={`/servicos?editar=${s.id}`} className="font-semibold hover:underline">{s.name}</Link>
                          <div className="text-xs text-muted">{s.durationMin} min{s.returnIntervalDays ? ` · retorno ${s.returnIntervalDays} d` : ""}{s.commissionPct != null ? ` · comissão ${Number(s.commissionPct)}%` : ""}{!s.onlineBooking ? " · sem agendamento online" : ""}</div>
                        </td>
                        <td className="text-right font-semibold">{formatBRL(toCents(s.price))}</td>
                        <td className="w-36 text-right whitespace-nowrap">{!s.isActive && <Badge tone="mist">inativo</Badge>} <Link href={`/servicos?editar=${s.id}`} className="btn btn-secondary btn-sm">Editar</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))
          )}
        </div>
        {showForm && (
          <Card title={editing ? `Editar: ${editing.name}` : "Novo serviço"}>
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
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="onlineBooking" defaultChecked={editing?.onlineBooking ?? true} className="h-4 w-4 accent-brand" /> Disponível no agendamento online</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-brand" /> Ativo</label>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
