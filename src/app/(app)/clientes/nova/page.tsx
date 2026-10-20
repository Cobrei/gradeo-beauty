import { Card, PageHeader } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { ClientForm } from "@/modules/crm/ui/client-form";

export const metadata = { title: "Nova cliente" };

export default async function NovaCliente({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const pros = await listProfessionals(actor);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nova cliente" subtitle="Nome e WhatsApp bastam. O resto você completa com o tempo." />
      <Card>
        <ClientForm professionals={pros} returnTo={sp.return} />
      </Card>
    </div>
  );
}
