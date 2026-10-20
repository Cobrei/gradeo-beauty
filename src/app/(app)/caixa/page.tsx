import { MoneyInput } from "@/components/ui/money-input";
import { Badge, Card, Field, Notice, PageHeader, Stat } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { cashSummary, currentCashSession, listCashSessions } from "@/modules/pos/application/orders";
import { cashMoveAction, closeCashAction, openCashAction } from "@/modules/pos/ui/actions";
import { PAYMENT_METHODS } from "@/modules/pos/domain/rules";
import { formatBRL, toCents } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { can } from "@/lib/context";

export const metadata = { title: "Caixa" };

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ fechado?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const session = await currentCashSession(actor);
  const summary = session ? await cashSummary(actor, session.id) : null;
  const history = await listCashSessions(actor);
  const manage = can(actor, "pos.cash.manage");
  return (
    <div>
      <PageHeader title="Caixa" subtitle={session ? `Aberto em ${formatDateTime(session.openedAt)}` : "Fechado"} action={session ? <Badge tone="ok">aberto</Badge> : <Badge tone="mist">fechado</Badge>} />
      {sp.fechado && <div className="mb-4"><Notice tone="ok">Caixa fechado. Bom descanso!</Notice></div>}
      {!session ? (
        <Card title="Abrir caixa" className="max-w-md">
          {manage ? (
            <Form action={openCashAction} submitLabel="Abrir caixa">
              <Field label="Fundo de troco" name="openingAmount">
                <MoneyInput name="openingAmount" defaultValue={0} />
              </Field>
            </Form>
          ) : (
            <p className="text-sm text-muted">Peça para a gerência abrir o caixa.</p>
          )}
        </Card>
      ) : (
        summary && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Faturado" value={formatBRL(summary.revenue)} hint={`${summary.ordersCount} comandas`} tone="ok" />
                <Stat label="Dinheiro esperado" value={formatBRL(summary.expectedCash)} hint="troco + dinheiro ± movimentos" tone="gold" />
                <Stat label="Pix" value={formatBRL(summary.byMethod.find((m) => m.method === "PIX")?.total ?? 0)} tone="info" />
                <Stat label="Cartões" value={formatBRL(summary.byMethod.filter((m) => m.method === "CREDIT" || m.method === "DEBIT").reduce((a, m) => a + m.total, 0))} tone="brand" />
              </div>
              <Card title="Por meio de pagamento">
                <ul className="text-sm">
                  <li className="flex justify-between py-1"><span>Fundo de troco</span><span>{formatBRL(toCents(session.openingAmount))}</span></li>
                  {summary.byMethod.map((m) => (
                    <li key={m.method} className="flex justify-between py-1"><span>{PAYMENT_METHODS[m.method]}</span><span className="font-semibold">{formatBRL(m.total)}</span></li>
                  ))}
                </ul>
              </Card>
              <Card title="Movimentos (sangria / suprimento / despesa)">
                {summary.moves.length === 0 ? <p className="text-sm text-muted">Nenhum.</p> : (
                  <ul className="text-sm">
                    {summary.moves.map((m) => (
                      <li key={m.id} className="flex justify-between py-1"><span>{m.kind === "IN" ? "＋" : "−"} {m.description}</span><span className={m.kind === "OUT" ? "text-bad" : "text-ok"}>{formatBRL(toCents(m.amount))}</span></li>
                    ))}
                  </ul>
                )}
                {manage && (
                  <div className="mt-3 border-t border-line pt-3">
                    <Form action={cashMoveAction} submitLabel="Lançar">
                      <input type="hidden" name="sessionId" value={session.id} />
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Tipo" name="kind">
                          <select id="kind" name="kind" className="field"><option value="OUT">Saída (sangria/despesa)</option><option value="IN">Entrada (suprimento)</option></select>
                        </Field>
                        <Field label="Valor" name="amount"><MoneyInput name="amount" required /></Field>
                        <Field label="Descrição" name="description"><input id="description" name="description" className="field" required placeholder="Ex.: água, motoboy" /></Field>
                      </div>
                    </Form>
                  </div>
                )}
              </Card>
            </div>
            {manage && (
              <Card title="Fechar caixa">
                <Form action={closeCashAction} submitLabel="Fechar caixa">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Field label="Dinheiro contado na gaveta" name="closingAmount" hint={`Esperado: ${formatBRL(summary.expectedCash)}`}>
                    <MoneyInput name="closingAmount" required />
                  </Field>
                  <Field label="Observações" name="notes"><input id="notes" name="notes" className="field" /></Field>
                </Form>
              </Card>
            )}
          </div>
        )
      )}
      {history.length > 0 && (
        <Card title="Fechamentos anteriores" className="mt-4 overflow-x-auto p-0">
          <table className="tbl">
            <thead><tr><th>Abertura</th><th>Fechamento</th><th className="text-right">Faturado</th><th className="text-right">Esperado</th><th className="text-right">Contado</th><th className="text-right">Diferença</th></tr></thead>
            <tbody>
              {history.filter((h) => h.closedAt).map((h) => {
                const s = (h.summaryJson ?? {}) as { revenue?: number };
                const diff = toCents(h.closingAmount ?? "0") - toCents(h.expectedCash ?? "0");
                return (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.openedAt)}</td>
                    <td>{h.closedAt ? formatDateTime(h.closedAt) : ""}</td>
                    <td className="text-right">{formatBRL(s.revenue ?? 0)}</td>
                    <td className="text-right">{formatBRL(toCents(h.expectedCash ?? "0"))}</td>
                    <td className="text-right">{formatBRL(toCents(h.closingAmount ?? "0"))}</td>
                    <td className={`text-right font-semibold ${diff === 0 ? "text-ok" : "text-bad"}`}>{formatBRL(diff)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
