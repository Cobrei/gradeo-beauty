import Link from "next/link";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { audience, getCampaign } from "@/modules/marketing/application/campaigns";
import { deleteDraftAction, dispatchCampaignAction, markSentAction, pauseCampaignAction, prepareCampaignAction } from "@/modules/marketing/ui/actions";
import { describeSegment } from "@/modules/crm/domain/segments";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Campanha" };

export default async function CampanhaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireActor();
  const [{ campaign: c, messages, stats }, settings] = await Promise.all([getCampaign(actor, id), getSettings(actor)]);
  const aud = c.status === "DRAFT" ? await audience(actor, c.segment, c.channel as "WHATSAPP" | "EMAIL") : [];
  const manual = settings.messageProvider === "MANUAL";
  const queued = messages.filter((m) => m.status === "QUEUED");
  const sent = messages.filter((m) => m.status === "SENT");
  const back = `/campanhas/${id}`;
  return (
    <div>
      <PageHeader title={c.name} subtitle={`${describeSegment(c.segment)} · ${c.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"}${c.voucherKind ? ` · voucher ${c.voucherKind === "PERCENT" ? `${Number(c.voucherValue)}%` : formatBRL(Math.round(Number(c.voucherValue) * 100))} por ${c.voucherDays} dias` : ""}`} action={<Link href="/campanhas" className="btn btn-secondary btn-sm">← Campanhas</Link>} />
      {sp.enviados && <div className="mb-4"><Notice tone="ok">Lote enviado: {sp.enviados} ok, {sp.falhas} falhas, {sp.restam} na fila.</Notice></div>}

      {c.status === "DRAFT" && (
        <Card className="mb-4 border border-brand/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{aud.length} clientes vão receber</div>
              <p className="text-sm text-muted">Ao preparar, o sistema gera a mensagem personalizada{c.voucherKind ? " e o voucher pessoal" : ""} de cada uma. Nada é enviado ainda.</p>
            </div>
            <div className="flex gap-2">
              <form action={deleteDraftAction}><input type="hidden" name="id" value={c.id} /><button className="btn btn-ghost">Excluir rascunho</button></form>
              <form action={prepareCampaignAction}><input type="hidden" name="id" value={c.id} /><button className="btn btn-primary" disabled={aud.length === 0}>Preparar envio</button></form>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm whitespace-pre-wrap">{c.message}</div>
          {aud.length > 0 && (
            <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Ver quem recebe</summary>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">{aud.map((a) => <li key={a.id}>{a.fullName} <span className="text-muted">· {formatPhone(a.phone)}</span></li>)}</ul>
            </details>
          )}
        </Card>
      )}

      {c.status !== "DRAFT" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Alcance" value={c.audienceCount} tone="info" />
            <Stat label="Enviadas" value={sent.length} hint={queued.length ? `${queued.length} na fila` : "fila vazia"} tone="ok" />
            <Stat label="Voltaram" value={stats.returnedClients} hint="compraram após o envio" tone="brand" />
            <Stat label="Vouchers usados" value={stats.redeemed} hint={`${formatBRL(stats.discount)} em descontos`} tone="gold" />
            <Stat label="Receita gerada" value={formatBRL(stats.returnedRevenue)} hint="comandas pagas de quem recebeu" tone="ok" />
          </div>
          {queued.length > 0 && (
            <Card className="mb-4 border border-warn/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{queued.length} mensagens prontas</div>
                  <p className="text-sm text-muted">{manual ? "Modo manual: clique em cada \"Enviar\" abaixo, o WhatsApp abre com o texto pronto e a mensagem já fica marcada como enviada. Depois atualize a página." : "Envio automático pela API oficial do WhatsApp, em lotes de 40."}</p>
                </div>
                <div className="flex gap-2">
                  {!manual && <form action={dispatchCampaignAction}><input type="hidden" name="id" value={c.id} /><button className="btn btn-primary">Enviar lote</button></form>}
                  {c.status !== "PAUSED" ? <form action={pauseCampaignAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="paused" value="1" /><button className="btn btn-ghost">Pausar</button></form> : <form action={pauseCampaignAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="paused" value="0" /><button className="btn btn-secondary">Retomar</button></form>}
                </div>
              </div>
            </Card>
          )}
          <Card className="overflow-x-auto p-0">
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Mensagem</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap"><Link href={`/clientes/${m.clientId}`} className="font-semibold hover:underline">{m.clientName}</Link><div className="text-xs text-muted">{formatPhone(m.to)}</div></td>
                    <td className="max-w-md text-xs text-ink-2">{m.body}</td>
                    <td><Badge tone={m.status === "SENT" ? "ok" : m.status === "FAILED" ? "bad" : "warn"}>{m.status === "SENT" ? `enviada ${m.sentAt ? formatDateTime(m.sentAt) : ""}` : m.status === "FAILED" ? `falhou: ${m.error}` : "na fila"}</Badge></td>
                    <td className="text-right">
                      {m.status === "QUEUED" && manual && c.status !== "PAUSED" && (
                        <div className="flex justify-end gap-1">
                          <a href={`/m/${m.id}`} target="_blank" rel="noopener" className="btn btn-wa btn-sm">Enviar no WhatsApp</a>
                          <form action={markSentAction}><input type="hidden" name="messageId" value={m.id} /><input type="hidden" name="return" value={back} /><button className="btn btn-ghost btn-sm" title="Já mandei por fora">✓</button></form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
