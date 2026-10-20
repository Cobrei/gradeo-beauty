import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { listCampaigns } from "@/modules/marketing/application/campaigns";
import { segmentSummary } from "@/modules/crm/application/use-cases";
import { CAMPAIGN_TEMPLATES } from "@/modules/marketing/domain/templates";
import { describeSegment } from "@/modules/crm/domain/segments";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Campanhas" };

const STATUS: Record<string, { label: string; tone: "mist" | "info" | "warn" | "ok" | "bad" }> = {
  DRAFT: { label: "rascunho", tone: "mist" },
  READY: { label: "pronta para enviar", tone: "info" },
  SENDING: { label: "enviando", tone: "warn" },
  SENT: { label: "enviada", tone: "ok" },
  PAUSED: { label: "pausada", tone: "bad" },
};

export default async function CampanhasPage() {
  const actor = await requireActor();
  const [rows, segments] = await Promise.all([listCampaigns(actor), segmentSummary(actor)]);
  const count = (k: string) => segments.find((s) => s.key === k)?.count ?? 0;
  return (
    <div>
      <PageHeader title="Campanhas" subtitle="Mensagem certa, para o grupo certo, com voucher rastreado até o caixa." action={<><LinkButton href="/vouchers" variant="secondary">Vouchers</LinkButton><LinkButton href="/mensagens" variant="secondary">Fila de envio</LinkButton><LinkButton href="/campanhas/nova">+ Campanha</LinkButton></>} />
      <Card title="Comece por um modelo" className="mb-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <Link key={t.key} href={`/campanhas/nova?modelo=${t.key}`} className="rounded-xl border border-line p-3 hover:border-brand hover:bg-brand-soft/40">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted">{describeSegment({ preset: t.preset as "ALL" })} · {count(t.preset)} clientes{t.voucher ? ` · ${t.voucher.value}${t.voucher.kind === "PERCENT" ? "%" : " R$"}` : ""}</div>
            </Link>
          ))}
        </div>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma campanha ainda" hint="A primeira leva 2 minutos: escolha um modelo acima." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="tbl">
            <thead><tr><th>Campanha</th><th>Público</th><th className="text-right">Alcance</th><th className="text-right">Enviadas</th><th>Status</th><th>Quando</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-mist/50">
                  <td><Link href={`/campanhas/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>{c.voucherKind && <div className="text-xs text-muted">voucher {c.voucherKind === "PERCENT" ? `${Number(c.voucherValue)}%` : formatBRL(Math.round(Number(c.voucherValue) * 100))}</div>}</td>
                  <td className="text-sm">{describeSegment(c.segment)}</td>
                  <td className="text-right">{c.audienceCount}</td>
                  <td className="text-right">{c.sentCount}{c.failedCount ? <span className="text-bad"> ({c.failedCount} falhas)</span> : ""}</td>
                  <td><Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge></td>
                  <td className="text-sm text-muted">{formatDateTime(c.startedAt ?? c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
