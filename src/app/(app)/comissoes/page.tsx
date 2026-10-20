import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { commissionDetail, commissionReport, listClosings, partnerReport } from "@/modules/pos/application/commissions";
import { getSettings } from "@/modules/core/application/settings";
import { formatCnpj } from "@/lib/cnpj";
import { closeCommissionAction, markClosingPaidAction } from "@/modules/pos/ui/actions";
import { can } from "@/lib/context";
import { formatBRL, toCents } from "@/lib/money";
import { firstOfMonth, formatBR, lastOfMonth, todayISO } from "@/lib/dates";

export const metadata = { title: "Comissões" };

export default async function ComissoesPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; pro?: string; aba?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.de ?? firstOfMonth(today);
  const to = sp.ate ?? lastOfMonth(today);
  const aba = sp.aba ?? "periodo";
  const lines = await commissionReport(actor, from, to);
  const detail = sp.pro ? await commissionDetail(actor, sp.pro, from, to) : [];
  const closings = can(actor, "commission.read_all") && aba === "fechamentos" ? await listClosings(actor) : [];
  const total = lines.reduce((a, l) => a + l.commission, 0);
  const settings = await getSettings(actor);
  const showPartner = settings.partnerMode && can(actor, "commission.read_all");
  const partner = showPartner && aba === "parceiro" ? await partnerReport(actor, from, to) : [];
  return (
    <div>
      <PageHeader title="Comissões" subtitle="Calculadas item a item nas comandas pagas. Feche o período para fixar os valores." />
      {can(actor, "commission.read_all") && <Tabs current={aba} items={[{ key: "periodo", label: "Período", href: `/comissoes?de=${from}&ate=${to}` }, { key: "fechamentos", label: "Fechamentos", href: `/comissoes?aba=fechamentos` }, ...(showPartner ? [{ key: "parceiro", label: "Salão-parceiro", href: `/comissoes?aba=parceiro&de=${from}&ate=${to}` }] : [])]} />}
      {aba === "parceiro" && showPartner && (
        <>
          <form action="/comissoes" className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="aba" value="parceiro" />
            <label className="text-xs text-muted">De<input type="date" name="de" defaultValue={from} className="field min-h-9 py-1 text-sm" /></label>
            <label className="text-xs text-muted">Até<input type="date" name="ate" defaultValue={to} className="field min-h-9 py-1 text-sm" /></label>
            <button className="btn btn-secondary btn-sm">Calcular</button>
            <a href={`/comissoes/parceiro.csv?de=${from}&ate=${to}`} className="btn btn-secondary btn-sm">Baixar planilha (CSV) para o contador</a>
          </form>
          {partner.length === 0 ? <EmptyState title="Sem comandas pagas no período" /> : (
            <Card className="overflow-x-auto p-0">
              <table className="tbl">
                <thead><tr><th>Profissional</th><th>CNPJ</th><th className="text-right">Total recebido</th><th className="text-right">Cota-parte do profissional</th><th className="text-right">Cota-parte do salão</th></tr></thead>
                <tbody>
                  {partner.map((r) => (
                    <tr key={r.professionalId}>
                      <td className="font-semibold">{r.professionalName}</td>
                      <td>{r.cnpj ? formatCnpj(r.cnpj) : <Link href={`/equipe?editar=${r.professionalId}`} className="text-warn underline">cadastrar CNPJ</Link>}</td>
                      <td className="text-right">{formatBRL(r.gross)}</td>
                      <td className="text-right">{formatBRL(r.partnerShare)}</td>
                      <td className="text-right font-bold">{formatBRL(r.salonShare)}</td>
                    </tr>
                  ))}
                  <tr className="bg-mist/60 font-bold">
                    <td colSpan={2}>Total</td>
                    <td className="text-right">{formatBRL(partner.reduce((a, r) => a + r.gross, 0))}</td>
                    <td className="text-right">{formatBRL(partner.reduce((a, r) => a + r.partnerShare, 0))}</td>
                    <td className="text-right">{formatBRL(partner.reduce((a, r) => a + r.salonShare, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          )}
          <p className="mt-3 text-xs text-muted">Pela Lei 13.352/2016, o salão-parceiro pode tributar só a cota-parte dele; o repasse ao profissional (MEI ou ME) vai nas deduções da nota. Exige contrato de parceria homologado. Confira as regras do seu município com o contador. Valores das comandas pagas, antes de ajustes de fechamento. <Link href="/lei-salao-parceiro" target="_blank" className="font-semibold text-brand underline">Entenda a Lei do Salão-Parceiro</Link></p>
        </>
      )}
      {aba === "periodo" && (
        <>
          <form action="/comissoes" className="mb-4 flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted">De<input type="date" name="de" defaultValue={from} className="field min-h-9 py-1 text-sm" /></label>
            <label className="text-xs text-muted">Até<input type="date" name="ate" defaultValue={to} className="field min-h-9 py-1 text-sm" /></label>
            <button className="btn btn-secondary btn-sm">Calcular</button>
            <Badge tone="brand">Total: {formatBRL(total)}</Badge>
          </form>
          {lines.length === 0 ? (
            <EmptyState title="Sem comandas pagas no período" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="overflow-x-auto p-0 lg:col-span-2">
                <table className="tbl">
                  <thead><tr><th>Profissional</th><th className="text-right">Serviços</th><th className="text-right">Produtos</th><th className="text-right">Comissão</th><th></th></tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.professionalId} className={sp.pro === l.professionalId ? "bg-mist/60" : ""}>
                        <td><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: l.color }} /><Link href={`/comissoes?de=${from}&ate=${to}&pro=${l.professionalId}`} className="font-semibold hover:underline">{l.professionalName}</Link>{l.closed && <Badge tone="ok">fechado</Badge>}</td>
                        <td className="text-right">{formatBRL(l.services)}</td>
                        <td className="text-right">{formatBRL(l.products)}</td>
                        <td className="text-right font-bold">{formatBRL(l.commission)}</td>
                        <td className="text-right">
                          {can(actor, "commission.close") && !l.closed && (
                            <Form action={closeCommissionAction} submitLabel="Fechar" className="inline-block">
                              <input type="hidden" name="professionalId" value={l.professionalId} />
                              <input type="hidden" name="from" value={from} />
                              <input type="hidden" name="to" value={to} />
                            </Form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              {sp.pro && (
                <Card title="Detalhe" className="overflow-x-auto">
                  <table className="tbl">
                    <thead><tr><th>Data</th><th>Item</th><th className="text-right">%</th><th className="text-right">R$</th></tr></thead>
                    <tbody>
                      {detail.map((d, i) => (
                        <tr key={i}><td className="whitespace-nowrap">{formatBR(d.date)}</td><td>{d.description}</td><td className="text-right">{Number(d.pct)}%</td><td className="text-right font-semibold">{formatBRL(toCents(d.commission))}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </>
      )}
      {aba === "fechamentos" && (
        closings.length === 0 ? <EmptyState title="Nenhum fechamento ainda" /> : (
          <Card className="overflow-x-auto p-0">
            <table className="tbl">
              <thead><tr><th>Profissional</th><th>Período</th><th className="text-right">Comissão</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {closings.map(({ closing: c, professionalName }) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{professionalName}</td>
                    <td>{formatBR(c.fromDate)} – {formatBR(c.toDate)}</td>
                    <td className="text-right font-bold">{formatBRL(toCents(c.commissionTotal))}</td>
                    <td><Badge tone={c.status === "PAID" ? "ok" : "warn"}>{c.status === "PAID" ? "pago" : "a pagar"}</Badge></td>
                    <td className="text-right">{c.status !== "PAID" && can(actor, "commission.close") && (<form action={markClosingPaidAction}><input type="hidden" name="id" value={c.id} /><button className="btn btn-secondary btn-sm">Marcar pago</button></form>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
      {!can(actor, "commission.read_all") && <p className="mt-4 text-xs text-muted">Você vê só as suas comissões.</p>}
    </div>
  );
}
