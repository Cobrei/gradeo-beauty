import Link from "next/link";
import { CopyHoursButton } from "@/components/ui/copy-hours";
import { Card, Field, Notice, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { LogoUpload } from "@/components/ui/logo-upload";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { saveSettingsAction } from "@/modules/core/ui/settings-actions";
import { assertCan } from "@/lib/context";
import { WEEKDAYS } from "@/lib/time";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Configurações" };

export default async function ConfigPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "core.settings.manage");
  const sp = await searchParams;
  const s = await getSettings(actor);
  const host = process.env.NEXT_PUBLIC_APP_HOST ? `https://${process.env.NEXT_PUBLIC_APP_HOST}` : "";
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" subtitle="Salão, horários, agendamento online e envio de mensagens." action={<><Link href="/configuracoes/automacoes" className="btn btn-secondary btn-sm">Automações</Link><Link href="/pacotes" className="btn btn-secondary btn-sm">Pacotes</Link></>} />
      {sp.salvo && <div className="mb-4"><Notice tone="ok">Salvo.</Notice></div>}
      <Form action={saveSettingsAction} submitLabel="Salvar configurações">
        <Card title="Marca do salão" className="mb-4">
          <LogoUpload initial={s.logoData} color={s.brandColor} />
        </Card>
        <Card title="Salão" className="mb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" name="salonName"><input id="salonName" name="salonName" className="field" required defaultValue={s.salonName} /></Field>
            <Field label="Endereço de agendamento" name="slug" hint={`${host}/agendar/${s.slug}`}><input id="slug" name="slug" className="field" required defaultValue={s.slug} /></Field>
            <Field label="WhatsApp do salão" name="whatsapp"><input id="whatsapp" name="whatsapp" className="field" defaultValue={formatPhone(s.whatsapp)} /></Field>
            <Field label="Telefone" name="phone"><input id="phone" name="phone" className="field" defaultValue={formatPhone(s.phone)} /></Field>
            <Field label="Instagram" name="instagram"><input id="instagram" name="instagram" className="field" defaultValue={s.instagram ?? ""} placeholder="@seusalao" /></Field>
            <Field label="Endereço" name="address"><input id="address" name="address" className="field" defaultValue={(s.addressJson as { text?: string } | null)?.text ?? ""} /></Field>
            <Field label="Link para avaliação (Google)" name="reviewUrl" hint="Vai na mensagem pós-atendimento." className="sm:col-span-2"><input id="reviewUrl" name="reviewUrl" className="field" defaultValue={s.reviewUrl ?? ""} placeholder="https://g.page/r/.../review" /></Field>
          </div>
        </Card>
        <Card title="Horário de funcionamento" className="mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">Marque os dias abertos. Ajuste o primeiro dia e toque no botão para repetir o horário nos outros.</p>
            <CopyHoursButton />
          </div>
          <div className="space-y-1">
            {WEEKDAYS.map((d, i) => {
              const h = s.openingHours[String(i)];
              return (
                <div key={d} className="grid grid-cols-6 items-center gap-2 text-sm">
                  <label className="col-span-2 flex items-center gap-2"><input type="checkbox" name={`wd_${i}`} defaultChecked={!!h} className="h-4 w-4 accent-[#b8475f]" /> {d}</label>
                  <input type="time" name={`open_${i}`} defaultValue={h?.open ?? "09:00"} className="field col-span-2 min-h-9 py-1" />
                  <input type="time" name={`close_${i}`} defaultValue={h?.close ?? "19:00"} className="field col-span-2 min-h-9 py-1" />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Agendamento online" className="mb-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="onlineBooking" defaultChecked={s.onlineBooking} className="h-4 w-4 accent-[#b8475f]" /> Clientes podem agendar pelo link</label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Grade de horários (min)" name="slotMinutes"><input id="slotMinutes" name="slotMinutes" type="number" min={5} max={60} step={5} className="field" defaultValue={s.slotMinutes} /></Field>
            <Field label="Antecedência mínima (min)" name="onlineBookingLeadMin"><input id="onlineBookingLeadMin" name="onlineBookingLeadMin" type="number" min={0} className="field" defaultValue={s.onlineBookingLeadMin} /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">Pedidos online entram como &quot;Pedido online&quot; na agenda para você confirmar.</p>
        </Card>
        <Card title="Recursos opcionais" className="mb-4">
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" name="partnerMode" defaultChecked={s.partnerMode} className="mt-0.5 h-4 w-4 accent-[#b8475f]" /><span><b>Trabalho com profissionais parceiros (Lei do Salão-Parceiro)</b><br /><span className="text-muted">Mostra o CNPJ de cada profissional na Equipe e o relatório de cota-parte em Comissões, para o contador. <Link href="/lei-salao-parceiro" target="_blank" className="font-semibold text-brand underline">O que é a lei?</Link></span></span></label>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span><b>Pesquisa de satisfação</b> e <b>Fidelidade</b><br /><span className="text-muted">Ligue ou desligue em Automações.</span></span>
              <Link href="/configuracoes/automacoes" className="btn btn-secondary btn-sm">Abrir Automações</Link>
            </div>
          </div>
        </Card>
        <Card title="Envio de mensagens" className="mb-4">
          <input type="hidden" name="messageProvider" value={s.messageProvider} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{s.messageProvider === "WA_QR" ? "Automático pelo WhatsApp do salão (QR code)" : s.messageProvider === "WA_CLOUD" ? "Automático pelo WhatsApp oficial (Meta)" : "Manual pelo seu WhatsApp"}</div>
              <p className="text-sm text-muted">{s.messageProvider === "MANUAL" ? "Um toque por mensagem, sem custo. Conecte o WhatsApp do salão para os envios saírem sozinhos." : s.waQrPhone ? `Número conectado: ${formatPhone(s.waQrPhone)}` : "Conectado."}</p>
            </div>
            <Link href="/configuracoes/whatsapp" className="btn btn-wa btn-sm">{s.waQrConnectedAt ? "Gerenciar WhatsApp" : "Conectar WhatsApp"}</Link>
          </div>
        </Card>
      </Form>
    </div>
  );
}
