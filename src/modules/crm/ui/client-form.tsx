import { Field } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { formatPhone } from "@/lib/phone";
import type { ClientRow } from "../application/use-cases";
import { saveClientAction } from "./actions";

export function ClientForm({ client, professionals, returnTo }: { client?: ClientRow; professionals: { id: string; name: string }[]; returnTo?: string }) {
  return (
    <Form action={saveClientAction} submitLabel={client ? "Salvar" : "Cadastrar cliente"}>
      {client && <input type="hidden" name="id" value={client.id} />}
      {returnTo && <input type="hidden" name="return" value={returnTo} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" name="fullName" className="sm:col-span-2">
          <input id="fullName" name="fullName" required className="field" defaultValue={client?.fullName ?? ""} autoFocus={!client} />
        </Field>
        <Field label="WhatsApp" name="phone" hint="Com DDD. É por aqui que as campanhas chegam.">
          <input id="phone" name="phone" inputMode="tel" className="field" defaultValue={client?.phone ? formatPhone(client.phone) : ""} placeholder="(51) 99999-9999" />
        </Field>
        <Field label="E-mail" name="email">
          <input id="email" name="email" type="email" className="field" defaultValue={client?.email ?? ""} />
        </Field>
        <Field label="Nascimento" name="birthDate" hint="Para a campanha de aniversário.">
          <input id="birthDate" name="birthDate" type="date" className="field" defaultValue={client?.birthDate ?? ""} />
        </Field>
        <Field label="Gênero" name="gender">
          <select id="gender" name="gender" className="field" defaultValue={client?.gender ?? "N"}>
            <option value="N">Não informar</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
        </Field>
        <Field label="Profissional preferida" name="preferredProfessionalId">
          <select id="preferredProfessionalId" name="preferredProfessionalId" className="field" defaultValue={client?.preferredProfessionalId ?? ""}>
            <option value="">—</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags" name="tags" hint="Separe por vírgula: vip, noiva, alérgica…">
          <input id="tags" name="tags" className="field" defaultValue={client?.tags?.join(", ") ?? ""} />
        </Field>
        <Field label="CPF (opcional, para nota)" name="cpf">
          <input id="cpf" name="cpf" inputMode="numeric" className="field" defaultValue={client?.cpf ?? ""} />
        </Field>
        <Field label="Observações gerais" name="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} className="field" defaultValue={client?.notes ?? ""} placeholder="Como gosta de ser atendida, horários que prefere…" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="marketingOptIn" defaultChecked={client ? !client.marketingOptOut : true} className="h-4 w-4 accent-brand" />
        Aceita receber mensagens e promoções do salão (LGPD)
      </label>
    </Form>
  );
}
