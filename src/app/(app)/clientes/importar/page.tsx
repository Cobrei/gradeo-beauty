import Link from "next/link";
import { Card, Field, Notice, PageHeader } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { importAction } from "@/modules/crm/ui/actions";
import { assertCan } from "@/lib/context";

export const metadata = { title: "Importar clientes" };

export default async function ImportarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  assertCan(actor, "crm.client.import");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Importar clientes" subtitle="Traga sua base em 1 minuto. Repetidas pelo telefone são ignoradas." />
      {sp.ok && (
        <div className="mb-4">
          <Notice tone="ok">
            Pronto: {sp.criadas} novas, {sp.atualizadas} atualizadas, {sp.puladas} puladas. <Link href="/clientes" className="underline">Ver clientes</Link> · <Link href="/campanhas/nova?modelo=winback" className="underline">Criar a primeira campanha</Link>
          </Notice>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="De onde vem">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-2">
            <li><b>Contatos do celular:</b> no Google Contatos (contacts.google.com) → Exportar → CSV. Ou no iPhone: Contatos → compartilhar → .vcf.</li>
            <li><b>Outro sistema</b> (Trinks, Booksy, Avec, Belasis): exporte a lista de clientes em CSV/Excel (salve como CSV).</li>
            <li><b>Planilha ou caderno:</b> cole abaixo, uma por linha: <code className="rounded bg-mist px-1">Nome, telefone, e-mail, nascimento, última visita</code>.</li>
          </ol>
          <p className="mt-3 text-xs text-muted">Reconhecemos as colunas pelo nome (nome, telefone/celular/whatsapp, e-mail, nascimento, última visita, observações). Datas em dd/mm/aaaa.</p>
        </Card>
        <Card title="Enviar">
          <Form action={importAction} submitLabel="Importar">
            <Field label="Arquivo CSV ou VCF" name="file">
              <input id="file" name="file" type="file" accept=".csv,.txt,.vcf,text/csv,text/vcard" className="field" />
            </Field>
            <Field label="ou cole a lista" name="pasted">
              <textarea id="pasted" name="pasted" rows={8} className="field font-mono text-sm" placeholder={"Maria Silva, 51 99999-1111, maria@email.com, 12/03/1990, 02/08/2026\nJoana Souza; 51988882222"} />
            </Field>
          </Form>
        </Card>
      </div>
    </div>
  );
}
