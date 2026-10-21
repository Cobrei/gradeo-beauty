import Link from "next/link";
import { Badge, Card, LinkButton, Notice, Stat, WaLink } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { dashboard, onboardingStatus } from "@/modules/reports/application/queries";
import { dayAgenda } from "@/modules/agenda/application/use-cases";
import { segmentSummary, upcomingBirthdays } from "@/modules/crm/application/use-cases";
import { can } from "@/lib/context";
import { formatBRL } from "@/lib/money";
import { todayISO, formatBR } from "@/lib/dates";
import { formatLongDate, localTime } from "@/lib/time";
import { APPT_STATUS } from "@/modules/agenda/domain/slots";
import { formatPhone } from "@/lib/phone";
import { ModuleGrid } from "@/components/ui/modules";
import { pendingLowFeedback } from "@/modules/reports/application/feedback";
import { pendingHumanCount } from "@/modules/marketing/application/receptionist";
import { markFeedbackHandledAction } from "@/modules/reports/ui/feedback-actions";

export const metadata = { title: "Início" };

export default async function Home({ searchParams }: { searchParams: Promise<{ bemvinda?: string; salvo?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const today = todayISO();
  const [d, settings, ob, aiPending] = await Promise.all([dashboard(actor), getSettings(actor), can(actor, "core.settings.manage") ? onboardingStatus(actor) : null, can(actor, "core.settings.manage") ? pendingHumanCount(actor) : 0]);
  const canAgenda = can(actor, "agenda.appointment.read") || can(actor, "agenda.appointment.read_own");
  const canCrm = can(actor, "crm.client.read");
  const [agenda, segments, bdays, lowFeedback] = await Promise.all([canAgenda ? dayAgenda(actor, today) : null, canCrm ? segmentSummary(actor) : [], canCrm ? upcomingBirthdays(actor, 7) : [], canCrm ? pendingLowFeedback(actor) : []]);
  const inactive = segments.find((s) => s.key === "INACTIVE");
  const overdue = segments.find((s) => s.key === "OVERDUE_CYCLE");
  const bookingUrl = `/agendar/${settings.slug}`;
  const upcoming = agenda?.appts.filter((a) => !["DONE", "CANCELLED", "NO_SHOW"].includes(a.status)).slice(0, 8) ?? [];

  return (
    <div className="space-y-5">
      {sp.salvo && <Notice tone="ok">{sp.salvo === "perfil" ? "Pronto, vamos te chamar assim." : "Configurações salvas."}</Notice>}
      {sp.bemvinda && (
        <Notice tone="ok">
          Bem-vinda ao gradeo beauty, {actor.nickname}! Seu acesso está pronto, com 30 dias de todos os recursos do plano Pro. Próximo passo: cadastre a <Link href="/equipe" className="underline">equipe</Link> e <Link href="/clientes/importar" className="underline">importe suas clientes</Link>.
        </Notice>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{settings.salonName}</h1>
          <p className="text-sm capitalize text-muted">{formatLongDate(today)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAgenda && <LinkButton href={`/agenda/novo?d=${today}`}>+ Agendar</LinkButton>}
          {can(actor, "pos.order.write") && <LinkButton href="/comandas/nova" variant="secondary">+ Comanda</LinkButton>}
        </div>
      </div>

      {ob && ob.done < ob.steps.length && (
        <Card className="border border-brand/25">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-brand">Por onde começar</div>
              <p className="text-lg font-bold">Deixe o salão pronto em 6 passos</p>
            </div>
            <span className="text-sm font-semibold text-muted">{ob.done} de {ob.steps.length} feitos</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-brand" style={{ width: `${(ob.done / ob.steps.length) * 100}%` }} /></div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {ob.steps.map((st, i) => (
              <li key={st.key}>
                <Link href={st.href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${st.done ? "border-line bg-mist/60 text-muted line-through" : "border-line bg-white font-semibold hover:border-brand"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${st.done ? "bg-ok text-white" : "bg-brand-soft text-brand"}`}>{st.done ? "✓" : i + 1}</span>
                  {st.label}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <ModuleGrid actor={actor} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {can(actor, "report.read") && <Stat label="Faturado hoje" value={formatBRL(d.revenueToday)} hint={`${d.ordersToday} comanda${d.ordersToday === 1 ? "" : "s"} · mês ${formatBRL(d.revenueMonth)}`} tone="ok" href="/relatorios" />}
        <Stat label="Atendimentos hoje" value={d.appts.total} hint={`${d.appts.done} finalizados${d.appts.requested ? ` · ${d.appts.requested} pedidos online` : ""}`} tone="info" href="/agenda" />
        <Stat label="Clientes sumidas" value={d.inactiveCount} hint={`≈ ${formatBRL(d.inactiveValue)} por visita de retorno`} tone="brand" href="/clientes?seg=INACTIVE" />
        <Stat label="Mensagens pendentes" value={d.pendingMessages} hint={d.pendingMessages ? "para enviar pelo WhatsApp" : "tudo enviado"} tone={d.pendingMessages ? "warn" : "mist"} href="/mensagens" />
      </div>

      {canCrm && (inactive?.count || overdue?.count) ? (
        <Card className="border border-brand/20 bg-gradient-to-br from-white to-brand-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-brand">Traga de volta</div>
              <p className="text-lg font-bold">
                {inactive?.count ?? 0} clientes sumidas e {overdue?.count ?? 0} atrasadas no ciclo.
              </p>
              <p className="text-sm text-ink-2">Uma campanha de retorno com voucher leva 2 minutos e paga o mês do sistema na primeira semana.</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/campanhas/nova?modelo=winback">Criar campanha de retorno</LinkButton>
              <LinkButton href="/clientes?seg=INACTIVE" variant="secondary">Ver a lista</LinkButton>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {agenda && (
          <Card title="Próximos atendimentos" action={<Link href="/agenda" className="text-sm font-semibold text-brand">Agenda completa</Link>} className="lg:col-span-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nada marcado daqui pra frente hoje. {settings.onlineBooking && <>Compartilhe seu link de agendamento: <Link href={bookingUrl} className="font-semibold text-brand">{bookingUrl}</Link></>}</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => {
                  const pro = agenda.pros.find((p) => p.id === a.professionalId);
                  const st = APPT_STATUS[a.status];
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-12 text-sm font-bold">{localTime(a.startsAt)}</div>
                      <span className="h-8 w-1 rounded-full" style={{ background: pro?.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">
                          <Link href={a.clientId ? `/clientes/${a.clientId}` : `/agenda/${a.id}`} className="hover:underline">{a.clientName}</Link>
                          {a.visitsCount === 0 && <Badge tone="gold">1ª vez</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {a.serviceName} · {pro?.name}
                        </div>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <Link href={`/agenda/${a.id}`} className="btn btn-ghost btn-sm">Abrir</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
        <div className="space-y-4">
          {aiPending > 0 && (
            <Link href="/recepcionista?f=equipe" className="card flex items-center justify-between gap-3 border border-warn/30">
              <span className="text-sm"><b>{aiPending} {aiPending === 1 ? "cliente aguarda" : "clientes aguardam"} a equipe</b><br /><span className="text-muted">A recepcionista passou para vocês responderem.</span></span>
              <span className="btn btn-secondary btn-sm">Ver</span>
            </Link>
          )}
          {lowFeedback.length > 0 && (
            <Card title="Avaliações para olhar" className="border border-warn/30">
              <ul className="space-y-3">
                {lowFeedback.map((f) => (
                  <li key={f.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-warn">Nota {f.score}</span> ·{" "}
                        {f.clientId ? <Link href={`/clientes/${f.clientId}`} className="font-semibold hover:underline">{f.client}</Link> : "Cliente"}
                        <div className="text-xs text-muted">{f.service} · {f.pro}</div>
                        {f.comment && <p className="mt-1 text-ink-2">“{f.comment}”</p>}
                      </div>
                      <form action={markFeedbackHandledAction}><input type="hidden" name="id" value={f.id} /><button className="btn btn-ghost btn-sm">Resolvido</button></form>
                    </div>
                    {f.phone && <div className="mt-1"><WaLink phone={f.phone} text={`Oi, ${(f.client ?? "").split(" ")[0]}! Aqui é do ${settings.salonName}. Vi sua avaliação e quero entender o que aconteceu para resolver com você.`}>Falar com ela</WaLink></div>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {canCrm && (
            <Card title="Aniversários da semana">
              {bdays.length === 0 ? (
                <p className="text-sm text-muted">Nenhum nos próximos 7 dias.</p>
              ) : (
                <ul className="space-y-2">
                  {bdays.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <Link href={`/clientes/${b.id}`} className="font-semibold hover:underline">{b.fullName}</Link>
                        <div className="text-xs text-muted">{formatBR(b.birthDate!).slice(0, 5)} · {formatPhone(b.phone)}</div>
                      </div>
                      <WaLink phone={b.phone} text={`Parabéns, ${b.fullName.split(" ")[0]}! 🎉 O ${settings.salonName} deseja um dia lindo pra você. Vem comemorar com a gente!`}>
                        Parabenizar
                      </WaLink>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {d.lowStock.length > 0 && (
            <Card title="Estoque baixo">
              <ul className="space-y-1 text-sm">
                {d.lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <Link href={`/produtos/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                    <span className="text-bad">{Number(p.stockQty)} un</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {canAgenda && settings.onlineBooking && (
            <Card title="Agendamento online">
              <p className="text-sm text-ink-2">Coloque na bio do Instagram e no WhatsApp:</p>
              <code className="mt-1 block break-all rounded-lg bg-mist px-2 py-1 text-xs">{`${process.env.NEXT_PUBLIC_APP_HOST ? "https://" + process.env.NEXT_PUBLIC_APP_HOST : ""}${bookingUrl}`}</code>
              <div className="mt-2 text-xs text-muted">{d.newClients30d} clientes novas nos últimos 30 dias.</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
