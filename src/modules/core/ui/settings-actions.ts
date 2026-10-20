"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { updateSettings } from "../application/settings";

export async function saveSettingsAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    const openingHours: Record<string, { open: string; close: string } | null> = {};
    for (let d = 0; d < 7; d++) openingHours[String(d)] = fd.get(`wd_${d}`) === "on" ? { open: String(fd.get(`open_${d}`) || "09:00"), close: String(fd.get(`close_${d}`) || "19:00") } : null;
    await updateSettings(actor, {
      salonName: fd.get("salonName"),
      slug: fd.get("slug"),
      whatsapp: fd.get("whatsapp") || undefined,
      phone: fd.get("phone") || undefined,
      instagram: fd.get("instagram") || undefined,
      address: fd.get("address") || undefined,
      slotMinutes: fd.get("slotMinutes") || 15,
      onlineBooking: fd.get("onlineBooking") === "on",
      onlineBookingLeadMin: fd.get("onlineBookingLeadMin") || 60,
      reviewUrl: fd.get("reviewUrl") || "",
      messageProvider: fd.get("messageProvider") || "MANUAL",
      logoData: fd.has("logoData") ? String(fd.get("logoData") ?? "") : undefined,
      brandColor: fd.get("brandColor") ? String(fd.get("brandColor")) : undefined,
      openingHours,
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/", "layout");
  redirect("/configuracoes?salvo=1");
}
