import { PageHeader } from "@/components/ui";
import { requireActor } from "@/modules/core/application/auth";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { listServices } from "@/modules/catalog/application/use-cases";
import { clientBrief } from "@/modules/crm/application/use-cases";
import { createAppointmentsAction } from "@/modules/agenda/ui/actions";
import { BookingWizard } from "@/modules/agenda/ui/booking-wizard";
import { todayISO } from "@/lib/dates";
import { toCents } from "@/lib/money";

export const metadata = { title: "Agendar" };

export default async function NovoAgendamento({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const [pros, services] = await Promise.all([listProfessionals(actor), listServices(actor)]);
  const chosen = sp.c ? await clientBrief(actor, sp.c) : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo agendamento" />
      <BookingWizard
        services={services.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, priceCents: toCents(s.price), category: s.category }))}
        pros={pros.map((p) => ({ id: p.id, name: p.name, nickname: p.nickname, color: p.color, serviceIds: p.serviceIds }))}
        initialDate={date}
        initialClient={chosen ? { id: chosen.id, fullName: chosen.fullName, phone: chosen.phone, visitsCount: chosen.visitsCount } : undefined}
        initialPro={sp.pro}
        initialTime={sp.t && /^\d{2}:\d{2}$/.test(sp.t) ? sp.t : undefined}
        returnTo={sp.return}
        action={createAppointmentsAction}
      />
    </div>
  );
}
