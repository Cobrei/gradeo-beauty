import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card, EmptyState, Field, Notice, PageHeader, Stat } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { ReceptionistChat } from "@/components/ui/receptionist-chat";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { conversationDetail, listConversations, receptionistAvailable, receptionistSettings } from "@/modules/marketing/application/receptionist";
import { resolveConversationAction, saveReceptionistAction } from "@/modules/marketing/ui/receptionist-actions";
import { assertCan } from "@/lib/context";
import { formatDateTime } from "@/lib/time";
import { formatPhone, waNumber } from "@/lib/phone";

export const metadata = { title: "Recepcionista" };

const EXEMPLO = `Estacionamento: rua tranquila, vaga na frente.
Pagamento: Pix, débito e crédito em até 3x.
Atrasos: tolerância de 15 minutos.
Coloração: precisa de teste de mecha 48h antes.`;

export default async function RecepcionistaPage({ searchParams }: { searchParams: Promise<{ salvo?: string; c?: string; f?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "core.settings.manage");
  const sp = await searchParams;
  const [cfg, salon, convs] = await Promise.all([receptionistSettings(actor), getSettings(actor), listConversations(actor, { onlyHuman: sp.f === "equipe" })]);
  const detail = sp.c ? await conversationDetail(actor, sp.c) : null;
  const available = receptionistAvailable();
  const h = await headers();
  const host = process.env.NEXT_PUBLIC_APP_HOST || h.get("host") || "";
  const link = `https://${host}/agendar/${cfg?.slug ?? ""}`;
  const name = cfg?.name?.trim() || "Bia";
  const pedidos = convs.filter((c) => c.appointmentId).length;
  const equipe = convs.filter((c) => c.needsHuman).length;

  return (
    <div>
      <PageHeader title="Recepcionista com IA" subtitle="Responde suas clientes 24 horas: preços, horários livres e pedidos de agendamento. Quem confirma é sempre o salão." />
      {sp.salvo && <div className="mb-4"><Notice tone="ok">Salvo.</Notice></div>}
      {!available && (
        <div className="mb-4">
          <Notice tone="warn">A recepcionista está em ativação pela gradeo. Você já pode deixar tudo configurado; ela começa a responder assim que for liberada.</Notice>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Conversas" value={convs.length} tone="info" />
        <Stat label="Pedidos de horário" value={pedidos} tone="ok" />
        <Stat label="Aguardando equipe" value={equipe} tone={equipe ? "warn" : "mist"} href="/recepcionista?f=equipe" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {detail ? (
            <Card
              title={detail.conv.clientName || (detail.conv.clientPhone ? formatPhone(detail.conv.clientPhone) : "Cliente sem nome")}
              action={<Link href="/recepcionista" className="text-sm text-brand">Todas</Link>}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge tone="mist">{detail.conv.channel === "WHATSAPP" ? "WhatsApp" : "Chat do link"}</Badge>
                {detail.conv.appointmentId && <Badge tone="ok">fez pedido de horário</Badge>}
                {detail.conv.needsHuman && <Badge tone="warn">precisa da equipe</Badge>}
                <span>{formatDateTime(detail.conv.lastMessageAt)}</span>
              </div>
              {detail.conv.needsHuman && (
                <div className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-sm">
                  <b>O que ela precisa:</b> {detail.conv.humanReason}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.conv.clientPhone && (
                      <a href={`https://wa.me/${waNumber(detail.conv.clientPhone)}`} target="_blank" className="btn btn-wa btn-sm">Chamar no WhatsApp</a>
                    )}
                    <form action={resolveConversationAction}>
                      <input type="hidden" name="id" value={detail.conv.id} />
                      <button className="btn btn-secondary btn-sm">Resolvido</button>
                    </form>
                  </div>
                </div>
              )}
              <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-xl bg-mist p-3">
                {detail.messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "mr-10 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm whitespace-pre-wrap shadow-sm" : "ml-10 rounded-2xl rounded-tr-sm bg-brand-soft px-3 py-2 text-sm whitespace-pre-wrap"}>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-muted">{m.role === "user" ? "Cliente" : name}</span>
                    {m.text}
                  </div>
                ))}
              </div>
            </Card>
          ) : convs.length === 0 ? (
            <EmptyState title={sp.f === "equipe" ? "Nada aguardando a equipe" : "Nenhuma conversa ainda"} hint="Quando uma cliente falar com a recepcionista, a conversa aparece aqui." />
          ) : (
            <Card className="p-0" title={sp.f === "equipe" ? "Aguardando a equipe" : undefined}>
              <ul className="divide-y divide-line">
                {convs.map((c) => (
                  <li key={c.id}>
                    <Link href={`/recepcionista?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-mist">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-soft font-bold text-brand">{(c.clientName || "?").slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{c.clientName || (c.clientPhone ? formatPhone(c.clientPhone) : "Cliente sem nome")}</span>
                        <span className="block text-xs text-muted">{c.channel === "WHATSAPP" ? "WhatsApp" : "Chat do link"} · {c.messageCount} mensagens · {formatDateTime(c.lastMessageAt)}</span>
                      </span>
                      {c.needsHuman ? <Badge tone="warn">equipe</Badge> : c.appointmentId ? <Badge tone="ok">pedido</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title="Configurar">
            <Form action={saveReceptionistAction} submitLabel="Salvar">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="on" defaultChecked={cfg?.on} className="mt-0.5 h-4 w-4 accent-brand" />
                <span>
                  <b>Ligar a recepcionista no meu link de agendamento</b>
                  <br />
                  <span className="text-muted">Aparece um botão &quot;Dúvidas? Fale com a {name}&quot; no seu link. No WhatsApp, ela entra quando o envio automático estiver conectado.</span>
                </span>
              </label>
              <Field label="Nome dela" name="name" hint="Ex.: Bia, Lu, Mel. Ela sempre se apresenta como recepcionista virtual.">
                <input id="name" name="name" maxLength={40} defaultValue={cfg?.name ?? ""} placeholder="Bia" className="field" />
              </Field>
              <Field label="O que ela precisa saber do salão" name="instructions" hint="Preços, horários e serviços ela já sabe pelo sistema. Aqui vão as regras e detalhes da casa.">
                <textarea id="instructions" name="instructions" rows={6} maxLength={3000} defaultValue={cfg?.instructions ?? ""} placeholder={EXEMPLO} className="field" />
              </Field>
              {!cfg?.onlineBooking && <p className="text-xs text-warn">Seu agendamento online está desligado em Configurações: ela vai responder dúvidas, mas não consegue criar pedidos de horário.</p>}
            </Form>
            {cfg?.on && (
              <p className="mt-3 text-xs text-muted">
                Seu link com a recepcionista:{" "}
                <a href={link} target="_blank" className="font-semibold break-all text-brand underline">{link}</a>
              </p>
            )}
          </Card>

          <Card title="Testar a conversa">
            <p className="mb-3 text-xs text-muted">Converse como se fosse uma cliente. Os pedidos de horário feitos aqui entram de verdade na Agenda (pode recusar depois).</p>
            {available ? (
              <ReceptionistChat endpoint="/api/recepcionista-teste" slug="teste" name={name} salonName={salon.salonName} floating={false} fixedSession="teste-interno-recepcionista" />
            ) : (
              <p className="text-sm text-muted">Disponível assim que a recepcionista for ativada.</p>
            )}
          </Card>

          <Card title="Como ela trabalha">
            <ul className="space-y-1 text-sm text-ink-2">
              <li>• Consulta seus serviços, preços e horários livres em tempo real.</li>
              <li>• Cria <b>pedidos</b> de horário: eles aparecem na Agenda para você confirmar.</li>
              <li>• Remarcação, cancelamento, reclamação ou dúvida de saúde: passa para a equipe e avisa aqui.</li>
              <li>• Nunca dá desconto, nunca inventa preço e não fala de outras clientes.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
