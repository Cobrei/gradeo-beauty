import { MoneyInput } from "@/components/ui/money-input";
import { assertCan } from "@/lib/context";
import { Card, EmptyState, Field, LinkButton, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listPackages, listServices } from "@/modules/catalog/application/use-cases";
import { savePackageAction } from "@/modules/catalog/ui/actions";
import { formatBRL, fromCents, toCents } from "@/lib/money";

export const metadata = { title: "Pacotes" };

export default async function PacotesPage({ searchParams }: { searchParams: Promise<{ novo?: string; editar?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "catalog.service.manage");
  const sp = await searchParams;
  const [packs, services] = await Promise.all([listPackages(actor), listServices(actor)]);
  const editing = sp.editar ? packs.find((p) => p.id === sp.editar) : undefined;
  const byId = new Map(services.map((s) => [s.id, s]));
  return (
    <div>
      <PageHeader title="Pacotes" subtitle="Venda 10 escovas pelo preço de 8: dinheiro adiantado e cliente que volta." action={<LinkButton href="/pacotes?novo=1">+ Pacote</LinkButton>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {packs.length === 0 ? <EmptyState title="Nenhum pacote" hint="Crie o primeiro ao lado. Os créditos são usados na comanda." /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packs.map((p) => {
                const full = p.items.reduce((a, i) => a + (byId.get(i.serviceId) ? toCents(byId.get(i.serviceId)!.price) * i.qty : 0), 0);
                return (
                  <Card key={p.id} title={p.name} action={<a href={`/pacotes?editar=${p.id}`} className="btn btn-secondary btn-sm">Editar</a>}>
                    <ul className="text-sm">{p.items.map((i) => <li key={i.serviceId}>{i.qty}× {byId.get(i.serviceId)?.name ?? "serviço"}</li>)}</ul>
                    <div className="mt-2 text-lg font-bold">{formatBRL(toCents(p.price))} <span className="text-xs font-normal text-muted">{full > 0 ? `(avulso ${formatBRL(full)} · ${Math.round((1 - toCents(p.price) / full) * 100)}% off)` : ""} · válido {p.validityDays} dias</span></div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        {(sp.novo || editing) && (
          <Card title={editing ? `Editar: ${editing.name}` : "Novo pacote"}>
            <Form action={savePackageAction} submitLabel="Salvar">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Nome" name="name"><input id="name" name="name" className="field" required defaultValue={editing?.name ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço" name="price"><MoneyInput name="price" required defaultValue={editing ? editing.price : null} /></Field>
                <Field label="Validade (dias)" name="validityDays"><input id="validityDays" name="validityDays" type="number" className="field" defaultValue={editing?.validityDays ?? 90} /></Field>
              </div>
              <div>
                <span className="label">Serviços incluídos</span>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="mb-2 grid grid-cols-4 gap-2">
                    <select name="serviceId" className="field col-span-3" defaultValue={editing?.items[i]?.serviceId ?? ""}>
                      <option value="">—</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input name="qty" type="number" min={1} className="field" defaultValue={editing?.items[i]?.qty ?? (i === 0 ? 10 : 1)} />
                  </div>
                ))}
              </div>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
