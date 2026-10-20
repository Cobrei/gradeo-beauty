import { Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listVouchers } from "@/modules/marketing/application/campaigns";
import { createVoucherAction, voucherStatusAction } from "@/modules/marketing/ui/actions";
import { listServices } from "@/modules/catalog/application/use-cases";
import { formatBRL, toCents } from "@/lib/money";
import { formatBR, todayISO } from "@/lib/dates";
import { addDays } from "@/lib/time";

export const metadata = { title: "Vouchers" };

export default async function VouchersPage() {
  const actor = await requireActor();
  const [rows, services] = await Promise.all([listVouchers(actor), listServices(actor)]);
  const today = todayISO();
  return (
    <div>
      <PageHeader title="Vouchers" subtitle="Códigos de desconto. Os de campanha são pessoais e de uso único; aqui você cria os genéricos (Instagram, parceria, indicação)." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length === 0 ? <EmptyState title="Nenhum voucher" /> : (
            <Card className="overflow-x-auto p-0">
              <table className="tbl">
                <thead><tr><th>Código</th><th>Desconto</th><th>Validade</th><th className="text-right">Usos</th><th className="text-right">Gerou</th><th></th></tr></thead>
                <tbody>
                  {rows.map(({ v, campaignName, clientName, redeemedTotal }) => (
                    <tr key={v.id} className={v.status !== "ACTIVE" ? "opacity-50" : ""}>
                      <td><code className="rounded bg-gold-soft px-1.5 font-bold">{v.code}</code><div className="text-xs text-muted">{v.name}{campaignName ? ` · campanha ${campaignName}` : ""}{clientName ? ` · ${clientName}` : ""}</div></td>
                      <td>{v.kind === "PERCENT" ? `${Number(v.value)}%` : formatBRL(toCents(v.value))}{toCents(v.minOrder) > 0 ? <div className="text-xs text-muted">mín. {formatBRL(toCents(v.minOrder))}</div> : null}</td>
                      <td className="whitespace-nowrap text-sm">{formatBR(v.validFrom)} – {formatBR(v.validUntil)}{v.validUntil < today && <Badge tone="mist">vencido</Badge>}</td>
                      <td className="text-right">{v.uses}/{v.maxUses}</td>
                      <td className="text-right font-semibold">{formatBRL(toCents(redeemedTotal))}</td>
                      <td className="text-right">
                        <form action={voucherStatusAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="status" value={v.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} /><button className="text-xs text-muted underline">{v.status === "ACTIVE" ? "pausar" : "ativar"}</button></form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
        <Card title="Novo voucher genérico">
          <Form action={createVoucherAction} submitLabel="Criar">
            <Field label="Nome" name="name"><input id="name" name="name" className="field" required placeholder="Ex.: Instagram outubro" /></Field>
            <Field label="Código (vazio = gera)" name="code"><input id="code" name="code" className="field uppercase" placeholder="BEMVINDA10" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tipo" name="kind"><select id="kind" name="kind" className="field"><option value="PERCENT">% desconto</option><option value="AMOUNT">R$ desconto</option></select></Field>
              <Field label="Valor" name="value"><input id="value" name="value" inputMode="decimal" className="field" required /></Field>
              <Field label="Pedido mínimo (R$)" name="minOrder"><input id="minOrder" name="minOrder" inputMode="decimal" className="field" defaultValue="0" /></Field>
              <Field label="Limite de usos" name="maxUses"><input id="maxUses" name="maxUses" type="number" className="field" defaultValue={100} /></Field>
              <Field label="De" name="validFrom"><input id="validFrom" name="validFrom" type="date" className="field" defaultValue={today} /></Field>
              <Field label="Até" name="validUntil"><input id="validUntil" name="validUntil" type="date" className="field" defaultValue={addDays(today, 30)} /></Field>
            </div>
            <Field label="Só para um serviço" name="serviceId"><select id="serviceId" name="serviceId" className="field" defaultValue=""><option value="">Qualquer</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </Form>
        </Card>
      </div>
    </div>
  );
}
