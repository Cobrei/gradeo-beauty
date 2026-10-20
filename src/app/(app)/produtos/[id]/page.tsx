import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Field, PageHeader, Stat } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listProducts, listStockMoves } from "@/modules/catalog/application/use-cases";
import { moveStockAction } from "@/modules/catalog/ui/actions";
import { formatBRL, toCents } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { can } from "@/lib/context";

export const metadata = { title: "Produto" };

const KIND: Record<string, string> = { IN: "Entrada", OUT: "Saída", SALE: "Venda", USE: "Uso interno", ADJUST: "Ajuste" };

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const p = (await listProducts(actor, { includeInactive: true })).find((x) => x.id === id);
  if (!p) notFound();
  const moves = await listStockMoves(actor, id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={p.name} subtitle={`${p.brand ?? ""} ${p.sku ? `· ${p.sku}` : ""}`} action={<Link href={`/produtos?editar=${p.id}`} className="btn btn-secondary btn-sm">Editar</Link>} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Em estoque" value={`${Number(p.stockQty)} ${p.unit}`} tone={Number(p.minStock) > 0 && Number(p.stockQty) <= Number(p.minStock) ? "bad" : "ok"} />
        <Stat label="Venda" value={formatBRL(toCents(p.salePrice))} tone="brand" />
        <Stat label="Custo" value={formatBRL(toCents(p.costPrice))} tone="mist" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {can(actor, "catalog.product.manage") && (
          <Card title="Movimentar estoque">
            <Form action={moveStockAction} submitLabel="Lançar">
              <input type="hidden" name="productId" value={p.id} />
              <Field label="Tipo" name="kind">
                <select id="kind" name="kind" className="field">
                  <option value="IN">Entrada (compra)</option>
                  <option value="USE">Uso interno (insumo)</option>
                  <option value="OUT">Saída / perda</option>
                  <option value="ADJUST">Ajuste para contagem</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantidade" name="qty"><input id="qty" name="qty" inputMode="decimal" className="field" required /></Field>
                <Field label="Custo unitário (entrada)" name="unitCost"><input id="unitCost" name="unitCost" inputMode="decimal" className="field" /></Field>
              </div>
              <Field label="Motivo" name="reason"><input id="reason" name="reason" className="field" /></Field>
            </Form>
          </Card>
        )}
        <Card title="Últimas movimentações">
          {moves.length === 0 ? <p className="text-sm text-muted">Nenhuma.</p> : (
            <ul className="divide-y divide-line text-sm">
              {moves.map((m) => (
                <li key={m.id} className="flex justify-between py-1.5"><span>{KIND[m.kind]} {m.reason ? `· ${m.reason}` : ""}<div className="text-xs text-muted">{formatDateTime(m.createdAt)}</div></span><span className={`font-semibold ${["IN"].includes(m.kind) ? "text-ok" : "text-bad"}`}>{m.kind === "IN" ? "+" : "−"}{Number(m.qty)}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
