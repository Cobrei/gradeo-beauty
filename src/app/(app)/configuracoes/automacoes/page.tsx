import Link from "next/link";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { listAutomations } from "@/modules/core/application/settings";
import { saveAutomationAction } from "@/modules/marketing/ui/actions";
import { DEFAULT_AUTOMATIONS } from "@/modules/catalog/domain/presets";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Automações" };

export default async function AutomacoesPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const rows = await listAutomations(actor);
  const order = DEFAULT_AUTOMATIONS.map((d) => d.kind);
  rows.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Automações" subtitle="Mensagens que o sistema prepara sozinho, todo dia. No modo manual elas caem na fila de envio." action={<Link href="/mensagens" className="btn btn-secondary btn-sm">Fila de envio</Link>} />
      {sp.salvo && <div className="mb-4"><Notice tone="ok">Automação salva.</Notice></div>}
      <div className="space-y-4">
        {rows.map((a) => {
          const def = DEFAULT_AUTOMATIONS.find((d) => d.kind === a.kind);
          const st = a.settings as Record<string, number | string>;
          return (
            <Card key={a.id} title={def?.label ?? a.kind} action={<Badge tone={a.enabled ? "ok" : "mist"}>{a.enabled ? "ligada" : "desligada"}</Badge>}>
              <Form action={saveAutomationAction} submitLabel="Salvar">
                <input type="hidden" name="kind" value={a.kind} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={a.enabled} className="h-4 w-4 accent-[#b8475f]" /> Ativa</label>
                <Field label="Mensagem" name="template" hint="Variáveis: {nome} {salao} {hora} {data} {servico} {profissional} {voucher} {validade} {link}">
                  <textarea id={`t_${a.kind}`} name="template" rows={3} className="field" defaultValue={a.template} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  {a.kind === "REMINDER_24H" && <Field label="Horas antes" name="hoursBefore"><input name="hoursBefore" type="number" className="field" defaultValue={Number(st.hoursBefore ?? 24)} /></Field>}
                  {a.kind === "THANKS" && <Field label="Horas depois" name="hoursAfter"><input name="hoursAfter" type="number" className="field" defaultValue={Number(st.hoursAfter ?? 2)} /></Field>}
                  {a.kind === "WIN_BACK" && <Field label="Dias sem vir" name="inactiveDays"><input name="inactiveDays" type="number" className="field" defaultValue={Number(st.inactiveDays ?? 60)} /></Field>}
                  {(a.kind === "BIRTHDAY" || a.kind === "WIN_BACK") && (
                    <>
                      <Field label="Voucher" name="voucherKind"><select name="voucherKind" className="field" defaultValue={String(st.voucherKind ?? "PERCENT")}><option value="PERCENT">%</option><option value="AMOUNT">R$</option></select></Field>
                      <Field label="Valor" name="voucherValue"><input name="voucherValue" inputMode="decimal" className="field" defaultValue={Number(st.voucherValue ?? 15)} /></Field>
                      <Field label="Validade (dias)" name="voucherDays"><input name="voucherDays" type="number" className="field" defaultValue={Number(st.voucherDays ?? 30)} /></Field>
                    </>
                  )}
                </div>
                {a.lastRunAt && <p className="text-xs text-muted">Última execução: {formatDateTime(a.lastRunAt)}</p>}
              </Form>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">As automações rodam sozinhas todo dia às 8h (lembretes cobrem os horários até o fim do dia seguinte) (e você pode forçar em &quot;Gerar mensagens de hoje&quot; na fila de envio).</p>
    </div>
  );
}
