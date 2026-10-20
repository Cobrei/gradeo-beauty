import Link from "next/link";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { pendingManualMessages } from "@/modules/marketing/application/automations";
import { flushQueueAction, markSentAction, runAutomationsNowAction } from "@/modules/marketing/ui/actions";
import { formatDateTime } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { assertCan, can } from "@/lib/context";

export const metadata = { title: "Fila de envio" };
export const maxDuration = 60;

const KIND: Record<string, string> = { REMINDER_24H: "Lembrete", THANKS: "Pós-atendimento", RETURN_INVITE: "Convite de retorno", BIRTHDAY: "Aniversário", WIN_BACK: "Resgate" };

export default async function MensagensPage({ searchParams }: { searchParams: Promise<{ rodou?: string; enviou?: string; falhou?: string; resta?: string }> }) {
  const actor = await requireActor();
  if (!can(actor, "mkt.message.send")) assertCan(actor, "mkt.campaign.manage");
  const sp = await searchParams;
  const [rows, settings] = await Promise.all([pendingManualMessages(actor), getSettings(actor)]);
  return (
    <div>
      <PageHeader
        title="Fila de envio"
        subtitle={settings.messageProvider === "MANUAL" ? "As automações preparam as mensagens; você envia com um toque (abre o WhatsApp já com o texto)." : "Envio automático pelo WhatsApp conectado do salão. Aqui ficam as que ainda vão sair (aos poucos) ou que falharam; dá para mandar com um toque também."}
        action={<>{can(actor, "core.settings.manage") && <Link href="/configuracoes/automacoes" className="btn btn-secondary btn-sm">Automações</Link>}<form action={runAutomationsNowAction}><button className="btn btn-primary btn-sm">Gerar mensagens de hoje</button></form>{settings.messageProvider !== "MANUAL" && rows.length > 0 && <form action={flushQueueAction}><button className="btn btn-wa btn-sm">Enviar a fila pelo WhatsApp conectado</button></form>}</>}
      />
      {sp.enviou && <div className="mb-4"><Notice tone={Number(sp.falhou) > 0 ? "warn" : "ok"}>Enviadas: {sp.enviou}{Number(sp.falhou) > 0 ? ` · falharam: ${sp.falhou}` : ""}{Number(sp.resta) > 0 ? ` · ainda na fila: ${sp.resta} (o envio é feito aos poucos para proteger o seu número)` : ""}</Notice></div>}
      {sp.rodou && <div className="mb-4"><Notice tone="ok">Automações executadas: {Object.entries(JSON.parse(sp.rodou) as Record<string, number>).map(([k, v]) => `${KIND[k] ?? k}: ${v}`).join(" · ") || "nada novo hoje"}</Notice></div>}
      {rows.length === 0 ? (
        <EmptyState title="Nada pendente" hint="Lembretes, agradecimentos, convites de retorno e aniversários aparecem aqui quando houver. As de campanha ficam na própria campanha." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-semibold">{m.clientName}</span><Badge tone="info">{KIND[m.kind ?? ""] ?? m.kind}</Badge><span className="text-xs text-muted">{formatPhone(m.to)} · {formatDateTime(m.createdAt)}</span></div>
                  <p className="mt-1 text-sm text-ink-2">{m.body}</p>
                </div>
                <a href={`/m/${m.id}`} target="_blank" rel="noopener" className="btn btn-wa btn-sm">Enviar no WhatsApp</a>
                <form action={markSentAction}><input type="hidden" name="messageId" value={m.id} /><input type="hidden" name="return" value="/mensagens" /><button className="btn btn-ghost btn-sm" title="Já enviei por fora">✓</button></form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
