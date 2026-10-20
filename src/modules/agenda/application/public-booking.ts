import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { withTenant } from "@/lib/context";
import { professionals, services } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { systemActor } from "@/lib/system-actor";
import { getPublicSalon } from "@/modules/core/application/settings";
import { availableSlots, createAppointment } from "./use-cases";

export async function publicCatalog(slug: string) {
  const salon = await getPublicSalon(slug);
  if (!salon || !salon.onlineBooking) return null;
  return withTenant(salon.tenantId, async (tx) => {
    const svcs = await tx
      .select({ id: services.id, name: services.name, category: services.category, durationMin: services.durationMin, price: services.price, description: services.description })
      .from(services)
      .where(and(isNull(services.deletedAt), eq(services.isActive, true), eq(services.onlineBooking, true)))
      .orderBy(asc(services.category), asc(services.sortOrder), asc(services.name));
    const pros = await tx
      .select({ id: professionals.id, name: professionals.name, nickname: professionals.nickname, color: professionals.color, serviceIds: professionals.serviceIds })
      .from(professionals)
      .where(and(isNull(professionals.deletedAt), eq(professionals.isActive, true), eq(professionals.acceptsOnline, true)))
      .orderBy(asc(professionals.sortOrder));
    return { salon, services: svcs, professionals: pros };
  });
}

export async function publicSlots(slug: string, dateISO: string, professionalId: string, serviceId: string) {
  const salon = await getPublicSalon(slug);
  if (!salon || !salon.onlineBooking) return [];
  return availableSlots(salon.tenantId, dateISO, professionalId, serviceId, { leadMinutes: salon.onlineBookingLeadMin, publicOnly: true });
}

export async function publicBook(slug: string, input: { professionalId: string; serviceId: string; date: string; time: string; name: string; phone: string; notes?: string }) {
  const salon = await getPublicSalon(slug);
  if (!salon || !salon.onlineBooking) throw new DomainError("CLOSED", "Agendamento online indisponível.");
  const slots = await availableSlots(salon.tenantId, input.date, input.professionalId, input.serviceId, { leadMinutes: salon.onlineBookingLeadMin, publicOnly: true });
  if (!slots.includes(input.time)) throw new DomainError("SLOT_TAKEN", "Esse horário acabou de ser ocupado. Escolha outro.");
  const actor = systemActor(salon.tenantId, "agendamento online");
  const r = await createAppointment(actor, { ...input, walkInName: input.name, newClientPhone: input.phone, source: "ONLINE" });
  return { id: r.id, salon };
}
