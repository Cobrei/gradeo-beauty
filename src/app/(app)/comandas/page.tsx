import Link from "next/link";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Tabs } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { listOrders } from "@/modules/pos/application/orders";
import { formatBRL, toCents } from "@/lib/money";
import { formatBR, todayISO } from "@/lib/dates";
import { can } from "@/lib/context";

export const metadata = { title: "Comandas" };

export default async function ComandasPage({ searchParams }: { searchParams: Promise<{ aba?: string; de?: string; ate?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const aba = sp.aba ?? "abertas";
  const today = todayISO();
  const rows = await listOrders(actor, aba === "abertas" ? { status: "OPEN" } : { status: aba === "canceladas" ? "CANCELLED" : "PAID", from: sp.de ?? today, to: sp.ate ?? today });
  const total = rows.reduce((a, r) => a + toCents(r.total), 0);
  return (
    <div>
      <PageHeader title="Comandas" subtitle="Da agenda para o caixa em dois toques." action={can(actor, "pos.order.write") ? <LinkButton href="/comandas/nova">+ Nova comanda</LinkButton> : undefined} />
      <Tabs current={aba} items={[{ key: "abertas", label: "Abertas", href: "/comandas?aba=abertas" }, { key: "pagas", label: "Pagas", href: "/comandas?aba=pagas" }, { key: "canceladas", label: "Canceladas", href: "/comandas?aba=canceladas" }]} />
      {aba !== "abertas" && (
        <form action="/comandas" className="mb-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="aba" value={aba} />
          <label className="text-xs text-muted">De<input type="date" name="de" defaultValue={sp.de ?? today} className="field min-h-9 py-1 text-sm" /></label>
          <label className="text-xs text-muted">Até<input type="date" name="ate" defaultValue={sp.ate ?? today} className="field min-h-9 py-1 text-sm" /></label>
          <button className="btn btn-secondary btn-sm">Filtrar</button>
          <Badge tone="ok">{rows.length} comandas · {formatBRL(total)}</Badge>
        </form>
      )}
      {rows.length === 0 ? (
        <EmptyState title={aba === "abertas" ? "Nenhuma comanda aberta" : "Nada neste período"} hint={aba === "abertas" ? "Ao finalizar um atendimento na agenda, a comanda abre sozinha." : undefined} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Data</th>
                <th className="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-mist/50">
                  <td className="text-muted">{r.number}</td>
                  <td className="font-semibold">{r.clientName}</td>
                  <td className="max-w-xs truncate text-muted">{r.items}</td>
                  <td className="whitespace-nowrap">{formatBR(r.serviceDate)}</td>
                  <td className="text-right font-semibold">{formatBRL(toCents(r.total))}</td>
                  <td className="text-right"><Link href={`/comandas/${r.id}`} className="btn btn-secondary btn-sm">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
