import { MoneyInput } from "@/components/ui/money-input";
import Link from "next/link";
import { Badge, Card, EmptyState, Field, LinkButton, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listProducts } from "@/modules/catalog/application/use-cases";
import { saveProductAction } from "@/modules/catalog/ui/actions";
import { formatBRL, fromCents, toCents } from "@/lib/money";
import { can } from "@/lib/context";

export const metadata = { title: "Produtos" };

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const all = await listProducts(actor, { includeInactive: true });
  const editing = sp.editar ? all.find((s) => s.id === sp.editar) : undefined;
  const manage = can(actor, "catalog.product.manage");
  const showForm = manage && (!!editing || sp.novo === "1");
  const stockValue = all.reduce((a, p) => a + Math.round(Number(p.stockQty) * toCents(p.costPrice)), 0);
  return (
    <div>
      <PageHeader title="Produtos e estoque" subtitle={`${all.filter((p) => p.isActive).length} produtos · estoque a custo ${formatBRL(stockValue)}`} action={manage ? <LinkButton href="/produtos?novo=1">+ Produto</LinkButton> : undefined} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {all.length === 0 ? (
            <EmptyState title="Nenhum produto" hint="Revenda (shampoo, óleo) e insumos (tinta, oxidante). O estoque baixa na comanda." />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="tbl">
                <thead><tr><th>Produto</th><th className="text-right">Estoque</th><th className="text-right">Venda</th><th className="text-right">Custo</th></tr></thead>
                <tbody>
                  {all.map((p) => {
                    const low = Number(p.minStock) > 0 && Number(p.stockQty) <= Number(p.minStock);
                    return (
                      <tr key={p.id} className={!p.isActive ? "opacity-50" : ""}>
                        <td>
                          <Link href={`/produtos/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                          <div className="text-xs text-muted">{p.brand ?? ""}{p.sku ? ` · ${p.sku}` : ""}{!p.forSale ? " · insumo" : ""}</div>
                        </td>
                        <td className="text-right">{Number(p.stockQty)} {p.unit} {low && <Badge tone="bad">baixo</Badge>}</td>
                        <td className="text-right font-semibold">{p.forSale ? formatBRL(toCents(p.salePrice)) : "—"}</td>
                        <td className="text-right text-muted">{formatBRL(toCents(p.costPrice))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
        {showForm && (
          <Card title={editing ? "Editar produto" : "Novo produto"}>
            <Form action={saveProductAction} submitLabel="Salvar">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Nome" name="name"><input id="name" name="name" className="field" required defaultValue={editing?.name ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca" name="brand"><input id="brand" name="brand" className="field" defaultValue={editing?.brand ?? ""} /></Field>
                <Field label="Código / SKU" name="sku"><input id="sku" name="sku" className="field" defaultValue={editing?.sku ?? ""} /></Field>
                <Field label="Preço de venda" name="salePrice"><MoneyInput name="salePrice" required defaultValue={editing ? editing.salePrice : null} /></Field>
                <Field label="Custo" name="costPrice"><MoneyInput name="costPrice" defaultValue={editing ? editing.costPrice : 0} /></Field>
                <Field label="Unidade" name="unit"><input id="unit" name="unit" className="field" defaultValue={editing?.unit ?? "un"} /></Field>
                <Field label="Estoque mínimo" name="minStock"><input id="minStock" name="minStock" inputMode="decimal" className="field" defaultValue={editing ? Number(editing.minStock) : 0} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="forSale" defaultChecked={editing?.forSale ?? true} className="h-4 w-4 accent-brand" /> É para revenda (aparece na comanda)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-brand" /> Ativo</label>
              {!editing && <p className="text-xs text-muted">Depois de salvar, lance a entrada de estoque na página do produto.</p>}
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
