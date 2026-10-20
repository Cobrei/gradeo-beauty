import Link from "next/link";
import { CopyHoursButton } from "@/components/ui/copy-hours";
import { Avatar, Badge, Card, Field, LinkButton, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getProfessional, listProfessionals } from "@/modules/team/application/use-cases";
import { listServices } from "@/modules/catalog/application/use-cases";
import { saveProfessionalAction } from "@/modules/team/ui/actions";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { WEEKDAYS } from "@/lib/time";
import { can, assertCan } from "@/lib/context";
import { formatPhone } from "@/lib/phone";
import { formatCnpj } from "@/lib/cnpj";
import { getSettings } from "@/modules/core/application/settings";

export const metadata = { title: "Equipe" };

export default async function EquipePage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "team.professional.manage");
  const sp = await searchParams;
  const [pros, services, settings] = await Promise.all([listProfessionals(actor, { includeInactive: true }), listServices(actor), getSettings(actor)]);
  const editing = sp.editar ? await getProfessional(actor, sp.editar) : undefined;
  const showForm = !!editing || sp.novo === "1";
  const custom = editing ? Object.keys(editing.workingHours).length > 0 : false;
  return (
    <div>
      <PageHeader title="Equipe" subtitle="Quem atende, comissão, horários e acesso ao sistema." action={<LinkButton href="/equipe?novo=1">+ Profissional</LinkButton>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {pros.map((p) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-3 ${!p.isActive ? "opacity-50" : ""}`}>
                  <Avatar name={p.name} color={p.color} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/equipe?editar=${p.id}`} className="font-semibold hover:underline">{p.name}</Link>{p.nickname && <span className="text-muted"> ({p.nickname})</span>}
                    <div className="text-xs text-muted">{formatPhone(p.phone)} · comissão {Number(p.commissionPct)}% serviços / {Number(p.productCommissionPct)}% produtos{p.userId ? " · tem acesso" : ""}{!p.acceptsOnline ? " · fora do online" : ""}{settings.partnerMode ? (p.cnpj ? ` · CNPJ ${formatCnpj(p.cnpj)}` : " · sem CNPJ") : ""}</div>
                  </div>
                  {!p.isActive && <Badge tone="mist">inativa</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        {showForm && (
          <Card title={editing ? `Editar ${editing.name}` : "Nova profissional"}>
            <Form action={saveProfessionalAction} submitLabel="Salvar">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Nome" name="name"><input id="name" name="name" className="field" required defaultValue={editing?.name ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Apelido (agenda)" name="nickname"><input id="nickname" name="nickname" className="field" defaultValue={editing?.nickname ?? ""} /></Field>
                <Field label="WhatsApp" name="phone"><input id="phone" name="phone" className="field" defaultValue={editing?.phone ? formatPhone(editing.phone) : ""} /></Field>
                <Field label="Cor na agenda" name="color"><input id="color" name="color" type="color" className="field h-12 p-1" defaultValue={editing?.color ?? "#b8475f"} /></Field>
                {settings.partnerMode ? <Field label="CNPJ (profissional parceiro)" name="cnpj" hint={<>MEI ou ME. Vai no relatório do salão-parceiro. <Link href="/lei-salao-parceiro" target="_blank" className="underline">O que é?</Link></>}><input id="cnpj" name="cnpj" inputMode="numeric" className="field" defaultValue={formatCnpj(editing?.cnpj)} placeholder="00.000.000/0000-00" /></Field> : <div />}
                <Field label="Comissão serviços %" name="commissionPct"><input id="commissionPct" name="commissionPct" type="number" min={0} max={100} step="0.5" className="field" defaultValue={editing ? Number(editing.commissionPct) : 40} /></Field>
                <Field label="Comissão produtos %" name="productCommissionPct"><input id="productCommissionPct" name="productCommissionPct" type="number" min={0} max={100} step="0.5" className="field" defaultValue={editing ? Number(editing.productCommissionPct) : 10} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="acceptsOnline" defaultChecked={editing?.acceptsOnline ?? true} className="h-4 w-4 accent-brand" /> Aparece no agendamento online</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-brand" /> Ativa</label>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-brand">Serviços que faz (vazio = todos)</summary>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceIds" value={s.id} defaultChecked={editing?.serviceIds.includes(s.id) ?? false} className="h-4 w-4 accent-brand" /> {s.name}</label>
                  ))}
                </div>
              </details>
              <details open={custom}>
                <summary className="cursor-pointer text-sm font-semibold text-brand">Horário próprio (diferente do salão)</summary>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="customHours" defaultChecked={custom} className="h-4 w-4 accent-brand" /> Usar horário próprio</label>
                <CopyHoursButton className="mt-2" />
                <div className="mt-2 space-y-1">
                  {WEEKDAYS.map((d, i) => {
                    const h = editing?.workingHours[String(i)];
                    return (
                      <div key={d} className="grid grid-cols-5 items-center gap-1 text-sm">
                        <label className="col-span-2 flex items-center gap-1"><input type="checkbox" name={`wd_${i}`} defaultChecked={custom ? !!h : i !== 0} className="h-4 w-4 accent-brand" /> {d.slice(0, 3)}</label>
                        <input type="time" name={`open_${i}`} defaultValue={h?.open ?? "09:00"} className="field col-span-1 min-h-9 px-1 py-1 text-xs" />
                        <span className="text-center text-xs text-muted">às</span>
                        <input type="time" name={`close_${i}`} defaultValue={h?.close ?? "19:00"} className="field col-span-1 min-h-9 px-1 py-1 text-xs" />
                      </div>
                    );
                  })}
                </div>
              </details>
              {can(actor, "core.user.manage") && (
                <details open={!!editing?.userEmail}>
                  <summary className="cursor-pointer text-sm font-semibold text-brand">Acesso ao sistema</summary>
                  <div className="mt-2 space-y-3">
                    <Field label="E-mail de login" name="email"><input id="email" name="email" type="email" className="field" defaultValue={editing?.userEmail ?? ""} /></Field>
                    <Field label={editing?.userEmail ? "Nova senha (vazio = manter)" : "Senha inicial"} name="password"><input id="password" name="password" type="password" minLength={8} className="field" autoComplete="new-password" /></Field>
                    {editing?.userRoleCode === "OWNER" ? (
                      <p className="rounded-xl bg-mist px-3 py-2 text-sm"><strong>Perfil: Dona.</strong> Acesso total ao salão; este perfil não muda por aqui.</p>
                    ) : (
                      <Field label="Perfil" name="roleCode">
                        <select id="roleCode" name="roleCode" className="field" defaultValue={editing?.userRoleCode ?? "PROFESSIONAL"}>
                          {Object.entries(SYSTEM_ROLES).filter(([k]) => k !== "OWNER").map(([k, r]) => <option key={k} value={k}>{r.name}</option>)}
                        </select>
                      </Field>
                    )}
                    <p className="text-xs text-muted">Profissional: vê só a própria agenda e comissões. Recepção: agenda de todas, comandas e caixa. Gerente: tudo menos configurações de conta.</p>
                  </div>
                </details>
              )}
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
