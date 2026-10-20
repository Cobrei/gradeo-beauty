import Link from "next/link";
import { LiveSearch } from "@/components/ui/live-search";
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader, WaLink } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { listClients, segmentSummary } from "@/modules/crm/application/use-cases";
import { SEGMENT_PRESETS } from "@/modules/crm/domain/segments";
import { formatBRL, toCents } from "@/lib/money";
import { formatBR, todayISO, daysBetween } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { can } from "@/lib/context";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; seg?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const seg = SEGMENT_PRESETS.find((p) => p.key === sp.seg)?.key;
  const [{ rows, total }, summary, settings] = await Promise.all([listClients(actor, { q: sp.q, segment: seg ? { preset: seg } : undefined, limit: 200 }), segmentSummary(actor), getSettings(actor)]);
  const today = todayISO();
  const current = summary.find((s) => s.key === seg);
  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${summary.find((s) => s.key === "ALL")?.count ?? 0} cadastradas`}
        action={
          <>
            {can(actor, "crm.client.import") && <LinkButton href="/clientes/importar" variant="secondary">Importar</LinkButton>}
            {can(actor, "crm.client.write") && <LinkButton href="/clientes/nova">+ Cliente</LinkButton>}
          </>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/clientes" className={`chip ${!seg ? "chip-on" : ""}`}>Todas</Link>
        {summary
          .filter((s) => s.key !== "ALL")
          .map((s) => (
            <Link key={s.key} href={`/clientes?seg=${s.key}`} className={`chip whitespace-nowrap ${seg === s.key ? "chip-on" : ""}`} title={s.hint}>
              {s.label} <span className="ml-1 rounded-full bg-mist px-1.5 text-xs">{s.count}</span>
            </Link>
          ))}
      </div>
      {current && current.key !== "ALL" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-brand/20">
          <div>
            <div className="font-bold">{current.label}: {current.count} clientes</div>
            <div className="text-sm text-muted">{current.hint}. Se metade voltar, são ≈ {formatBRL(Math.round(current.value / 2))} em atendimentos.</div>
          </div>
          {can(actor, "mkt.campaign.manage") && current.count > 0 && <LinkButton href={`/campanhas/nova?preset=${current.key}`}>Criar campanha para elas</LinkButton>}
        </Card>
      )}
      <div className="mb-4">
        <LiveSearch placeholder="Digite nome, telefone ou e-mail: a lista filtra enquanto você escreve" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={sp.q ? "Nenhuma cliente encontrada" : "Sua base começa aqui"} hint={sp.q ? "Tente só o primeiro nome ou parte do telefone." : "Importe os contatos do celular ou uma planilha e em 1 minuto você já pode disparar uma campanha."} action={can(actor, "crm.client.import") ? <LinkButton href="/clientes/importar">Importar clientes</LinkButton> : undefined} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Última visita</th>
                <th className="text-right">Visitas</th>
                <th className="text-right">Total gasto</th>
                <th>Ritmo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = r.lastVisitAt ? daysBetween(r.lastVisitAt, today) : null;
                const late = days !== null && r.avgIntervalDays ? days > Math.max(r.avgIntervalDays, 14) : false;
                return (
                  <tr key={r.id} className="hover:bg-mist/50">
                    <td>
                      <Link href={`/clientes/${r.id}`} className="flex items-center gap-2">
                        <Avatar name={r.fullName} size={34} />
                        <span>
                          <span className="block font-semibold">{r.fullName}</span>
                          <span className="block text-xs text-muted">{formatPhone(r.phone)}{r.marketingOptOut ? " · sem mensagens" : ""}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">
                      {r.lastVisitAt ? (
                        <>
                          {formatBR(r.lastVisitAt)} <span className={`text-xs ${days! > 45 ? "text-bad" : "text-muted"}`}>({days} d)</span>
                        </>
                      ) : (
                        <span className="text-muted">nunca</span>
                      )}
                    </td>
                    <td className="text-right">{r.visitsCount}</td>
                    <td className="text-right font-semibold">{formatBRL(toCents(r.totalSpent))}</td>
                    <td>
                      {r.avgIntervalDays ? <Badge tone={late ? "warn" : "mist"}>a cada {r.avgIntervalDays} d{late ? " · atrasada" : ""}</Badge> : null}
                    </td>
                    <td className="text-right">
                      <WaLink phone={r.phone} text={`Oi ${r.fullName.split(" ")[0]}! Aqui é do ${settings.salonName} 💕`}>WhatsApp</WaLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > rows.length && <p className="px-3 py-2 text-xs text-muted">Mostrando {rows.length} de {total}. Refine a busca.</p>}
        </Card>
      )}
    </div>
  );
}
