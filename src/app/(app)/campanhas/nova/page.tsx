import { Card, Field, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { segmentSummary } from "@/modules/crm/application/use-cases";
import { SEGMENT_PRESETS } from "@/modules/crm/domain/segments";
import { listServices } from "@/modules/catalog/application/use-cases";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { saveCampaignAction } from "@/modules/marketing/ui/actions";
import { CAMPAIGN_TEMPLATES, renderTemplate } from "@/modules/marketing/domain/templates";

export const metadata = { title: "Nova campanha" };

export default async function NovaCampanha({ searchParams }: { searchParams: Promise<{ modelo?: string; preset?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const [settings, segments, services, pros] = await Promise.all([getSettings(actor), segmentSummary(actor), listServices(actor), listProfessionals(actor)]);
  const tpl = CAMPAIGN_TEMPLATES.find((t) => t.key === sp.modelo);
  const preset = sp.preset ?? tpl?.preset ?? "INACTIVE";
  const preview = renderTemplate(tpl?.message ?? "", { nome: "Maria", salao: settings.salonName, voucher: tpl?.voucher ? `${tpl.voucher.value}% de desconto (código GB-AB12CD)` : "", validade: "30/11", link: `https://.../agendar/${settings.slug}` });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nova campanha" subtitle="Escolha quem recebe, escreva (ou use o modelo) e decida se vai com voucher." />
      <Form action={saveCampaignAction} submitLabel="Salvar e ver o público">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="1. Quem recebe" className="md:row-span-2">
            <Field label="Nome da campanha" name="name"><input id="name" name="name" className="field" required defaultValue={tpl?.name ?? ""} /></Field>
            <div className="mt-3 space-y-1">
              {SEGMENT_PRESETS.map((p) => {
                const s = segments.find((x) => x.key === p.key);
                return (
                  <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                    <input type="radio" name="preset" value={p.key} defaultChecked={preset === p.key} className="accent-brand" />
                    <span className="flex-1"><b>{p.label}</b> <span className="text-muted">· {p.hint}</span></span>
                    <span className="rounded-full bg-mist px-2 text-xs font-bold">{s?.count ?? 0}</span>
                  </label>
                );
              })}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">Refinar público</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Dias sem vir (sumidas)" name="inactiveDays"><input id="inactiveDays" name="inactiveDays" type="number" className="field" placeholder="45" /></Field>
                <Field label="Gênero" name="gender"><select id="gender" name="gender" className="field" defaultValue=""><option value="">Todos</option><option value="F">Mulheres</option><option value="M">Homens</option></select></Field>
                <Field label="Já fez o serviço" name="segServiceId"><select id="segServiceId" name="segServiceId" className="field" defaultValue=""><option value="">Qualquer</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                <Field label="Profissional preferida" name="segProfessionalId"><select id="segProfessionalId" name="segProfessionalId" className="field" defaultValue=""><option value="">Qualquer</option>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                <Field label="Tags (vírgula)" name="tags" className="col-span-2"><input id="tags" name="tags" className="field" /></Field>
              </div>
            </details>
            <p className="mt-3 text-xs text-muted">Só recebem clientes com WhatsApp e que não pediram para sair das mensagens.</p>
          </Card>
          <Card title="2. Mensagem">
            <input type="hidden" name="channel" value="WHATSAPP" />
            <Field label="Texto" name="message" hint="Variáveis: {nome} {salao} {voucher} {validade} {link}">
              <textarea id="message" name="message" rows={7} className="field" required defaultValue={tpl?.message ?? `Oi {nome}! Aqui é do {salao} 💕 `} />
            </Field>
            {tpl && <div className="mt-2 rounded-xl bg-[#e7f8ec] px-3 py-2 text-sm"><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ok">prévia</div>{preview}</div>}
          </Card>
          <Card title="3. Voucher (opcional)">
            <div className="grid grid-cols-3 gap-2">
              <Field label="Tipo" name="voucherKind">
                <select id="voucherKind" name="voucherKind" className="field" defaultValue={tpl?.voucher?.kind ?? ""}>
                  <option value="">Sem voucher</option>
                  <option value="PERCENT">% de desconto</option>
                  <option value="AMOUNT">R$ de desconto</option>
                </select>
              </Field>
              <Field label="Valor" name="voucherValue"><input id="voucherValue" name="voucherValue" inputMode="decimal" className="field" defaultValue={tpl?.voucher?.value ?? ""} /></Field>
              <Field label="Validade (dias)" name="voucherDays"><input id="voucherDays" name="voucherDays" type="number" className="field" defaultValue={tpl?.voucher?.days ?? 15} /></Field>
            </div>
            <Field label="Só para um serviço" name="voucherServiceId"><select id="voucherServiceId" name="voucherServiceId" className="field" defaultValue=""><option value="">Qualquer serviço</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <p className="text-xs text-muted">Cada cliente recebe um código pessoal, de uso único, que a recepção digita na comanda. Assim você sabe exatamente quanto a campanha rendeu.</p>
          </Card>
        </div>
      </Form>
    </div>
  );
}
