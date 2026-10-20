import Link from "next/link";
import { ClientPicker } from "@/components/ui/client-picker";
import { redirect } from "next/navigation";
import { Avatar, Card, Field, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { openOrder } from "@/modules/pos/application/orders";
import { openOrderAction } from "@/modules/pos/ui/actions";
import { clientBrief, listClients } from "@/modules/crm/application/use-cases";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Nova comanda" };

export default async function NovaComanda({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  // Vindo da agenda: abre direto.
  if (sp.atendimento) {
    const id = await openOrder(actor, { appointmentIds: [sp.atendimento] });
    redirect(`/comandas/${id}`);
  }
  if (sp.cliente) {
    const id = await openOrder(actor, { clientId: sp.cliente });
    redirect(`/comandas/${id}`);
  }
  const q = sp.q?.trim() ?? "";
  const results = q.length >= 2 ? (await listClients(actor, { q, limit: 8 })).rows : [];
  const chosen = sp.c ? await clientBrief(actor, sp.c) : undefined;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nova comanda" subtitle="Para quem é?" />
      <Card>
        {chosen ? (
          <Form action={openOrderAction} submitLabel="Abrir comanda">
            <input type="hidden" name="clientId" value={chosen.id} />
            <div className="flex items-center gap-3">
              <Avatar name={chosen.fullName} />
              <div>
                <div className="font-semibold">{chosen.fullName}</div>
                <div className="text-xs text-muted">{formatPhone(chosen.phone)}</div>
              </div>
              <Link href="/comandas/nova" className="ml-auto text-sm text-brand">trocar</Link>
            </div>
          </Form>
        ) : (
          <>
            <ClientPicker hrefTemplate="/comandas/nova?c=__ID__" emptyHint="Ninguém com esse nome. Use a venda avulsa abaixo ou cadastre a cliente." />
            <ul className="mt-2 divide-y divide-line">
              {results.map((r) => (
                <li key={r.id}>
                  <Link href={`/comandas/nova?c=${r.id}`} className="flex items-center gap-2 py-2 hover:bg-mist">
                    <Avatar name={r.fullName} size={32} />
                    <span className="text-sm font-semibold">{r.fullName}</span>
                    <span className="text-xs text-muted">{formatPhone(r.phone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Sem cadastro (venda avulsa)</p>
              <Form action={openOrderAction} submitLabel="Abrir comanda avulsa">
                <Field label="Nome" name="walkInName">
                  <input id="walkInName" name="walkInName" className="field" placeholder="Ex.: Cliente balcão" required />
                </Field>
              </Form>
              <p className="mt-2 text-xs text-muted">Prefere cadastrar? <Link href="/clientes/nova?return=/comandas/nova" className="font-semibold text-brand">Nova cliente</Link></p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
