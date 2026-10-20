import { Card, PageHeader, Stat } from "@/components/ui";
import { feedbackSummary } from "@/modules/reports/application/feedback";
import { requireActor } from "@/modules/core/application/auth";
import { periodReport, retentionCohorts } from "@/modules/reports/application/queries";
import { PAYMENT_METHODS } from "@/modules/pos/domain/rules";
import { formatBRL } from "@/lib/money";
import { firstOfMonth, formatBR, lastOfMonth, monthLabel, todayISO } from "@/lib/dates";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.de ?? firstOfMonth(today);
  const to = sp.ate ?? lastOfMonth(today);
  const [r, cohorts, fb] = await Promise.all([periodReport(actor, from, to), retentionCohorts(actor), feedbackSummary(actor, from, to)]);
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.total));
  const maxPro = Math.max(1, ...r.byProfessional.map((p) => p.total));
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Faturamento, equipe, serviços e retenção." />
      <form action="/relatorios" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">De<input type="date" name="de" defaultValue={from} className="field min-h-9 py-1 text-sm" /></label>
        <label className="text-xs text-muted">Até<input type="date" name="ate" defaultValue={to} className="field min-h-9 py-1 text-sm" /></label>
        <button className="btn btn-secondary btn-sm">Aplicar</button>
      </form>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Faturamento" value={formatBRL(r.revenue)} tone="ok" hint={`${r.orders} comandas`} />
        <Stat label="Ticket médio" value={formatBRL(r.ticket)} tone="gold" />
        <Stat label="Serviços" value={formatBRL(r.services)} tone="brand" />
        <Stat label="Produtos" value={formatBRL(r.products)} tone="info" />
        <Stat label="Clientes atendidas" value={r.uniqueClients} hint={`${r.newClients} novas · ${r.returningClients} recorrentes`} tone="mist" />
        <Stat label="Faltas" value={r.noShows} hint={`${r.appointmentsDone} atendimentos feitos`} tone={r.noShows ? "bad" : "mist"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Por dia">
          {r.byDay.length === 0 ? <p className="text-sm text-muted">Sem comandas pagas.</p> : (
            <div className="flex h-40 items-end gap-1">
              {r.byDay.map((d) => (
                <div key={d.day} className="group relative flex-1 rounded-t bg-brand/80 hover:bg-brand" style={{ height: `${Math.max((d.total / maxDay) * 100, 2)}%` }} title={`${formatBR(d.day)}: ${formatBRL(d.total)} (${d.orders})`} />
              ))}
            </div>
          )}
          <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{r.byDay[0] ? formatBR(r.byDay[0].day) : ""}</span><span>{r.byDay.at(-1) ? formatBR(r.byDay.at(-1)!.day) : ""}</span></div>
        </Card>
        <Card title="Por profissional">
          <ul className="space-y-2">
            {r.byProfessional.map((p) => (
              <li key={p.name} className="text-sm">
                <div className="flex justify-between"><span className="font-semibold">{p.name}</span><span>{formatBRL(p.total)} <span className="text-xs text-muted">· comissão {formatBRL(p.commission)}</span></span></div>
                <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${(p.total / maxPro) * 100}%`, background: p.color }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Serviços mais vendidos">
          <table className="tbl"><tbody>{r.byService.map((s) => <tr key={s.name}><td>{s.name}</td><td className="text-right text-muted">{s.qty}×</td><td className="text-right font-semibold">{formatBRL(s.total)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Meios de pagamento e descontos">
          <table className="tbl"><tbody>
            {r.byMethod.map((m) => <tr key={m.method}><td>{PAYMENT_METHODS[m.method]}</td><td className="text-right font-semibold">{formatBRL(m.total)}</td></tr>)}
            <tr><td className="text-muted">Descontos manuais</td><td className="text-right text-muted">− {formatBRL(r.discounts)}</td></tr>
            <tr><td className="text-muted">Vouchers</td><td className="text-right text-muted">− {formatBRL(r.vouchers)}</td></tr>
          </tbody></table>
        </Card>
        {fb.total > 0 && (
          <Card title="Satisfação das clientes (pesquisa de 1 a 5)" className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-6">
              <div><div className="text-3xl font-extrabold text-brand">{fb.avg.toFixed(1).replace(".", ",")}</div><div className="text-xs text-muted">média · {fb.total} avaliações</div></div>
              <div><div className="text-3xl font-extrabold text-ok">{Math.round((fb.promoters / fb.total) * 100)}%</div><div className="text-xs text-muted">deram 4 ou 5</div></div>
              <div><div className="text-3xl font-extrabold text-warn">{fb.detractors}</div><div className="text-xs text-muted">notas de 1 a 3</div></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <table className="tbl"><thead><tr><th>Profissional</th><th className="text-right">Avaliações</th><th className="text-right">Média</th></tr></thead>
                <tbody>{fb.byPro.map((p) => <tr key={p.name}><td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</td><td className="text-right">{p.n}</td><td className="text-right font-bold">{p.avg.toFixed(1).replace(".", ",")}</td></tr>)}</tbody>
              </table>
              <ul className="space-y-2 text-sm">
                {fb.comments.length === 0 ? <li className="text-muted">Nenhum comentário escrito no período.</li> : fb.comments.map((c, i) => <li key={i}><b>{c.score}</b> · {c.client ?? "Cliente"}: <span className="text-ink-2">“{c.comment}”</span></li>)}
              </ul>
            </div>
          </Card>
        )}
        <Card title="Retorno de clientes mês a mês: das que vieram pela primeira vez, quantas voltaram em 60 dias" className="lg:col-span-2">
          {cohorts.length === 0 ? <p className="text-sm text-muted">Precisa de pelo menos dois meses de comandas.</p> : (
            <table className="tbl">
              <thead><tr><th>Mês</th><th className="text-right">Clientes</th><th className="text-right">Voltaram</th><th className="text-right">Retenção</th></tr></thead>
              <tbody>{cohorts.map((c) => <tr key={c.month}><td>{monthLabel(c.month + "-01")}</td><td className="text-right">{c.clients}</td><td className="text-right">{c.returned}</td><td className="text-right font-bold">{c.clients ? Math.round((c.returned / c.clients) * 100) : 0}%</td></tr>)}</tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-muted">O mês atual ainda está em andamento: a retenção dele só fecha depois de 60 dias.</p>
        </Card>
      </div>
    </div>
  );
}
