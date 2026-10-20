"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { saveProfessional } from "../application/use-cases";

const on = (v: FormDataEntryValue | null) => v === "on" || v === "true";

export async function saveProfessionalAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  try {
    const actor = await requireActor();
    const workingHours: Record<string, { open: string; close: string } | null> = {};
    for (let d = 0; d < 7; d++) {
      const works = on(fd.get(`wd_${d}`));
      workingHours[String(d)] = works ? { open: String(fd.get(`open_${d}`) || "09:00"), close: String(fd.get(`close_${d}`) || "19:00") } : null;
    }
    const customHours = on(fd.get("customHours"));
    await saveProfessional(actor, id, {
      name: fd.get("name"),
      nickname: fd.get("nickname") || undefined,
      phone: fd.get("phone") || undefined,
      color: fd.get("color") || "#b8475f",
      commissionPct: fd.get("commissionPct") || 40,
      productCommissionPct: fd.get("productCommissionPct") || 10,
      acceptsOnline: on(fd.get("acceptsOnline")),
      isActive: fd.get("isActive") == null ? true : on(fd.get("isActive")),
      serviceIds: fd.getAll("serviceIds").map(String),
      workingHours: customHours ? workingHours : {},
      email: fd.get("email") || "",
      password: fd.get("password") || "",
      roleCode: fd.get("roleCode") || "PROFESSIONAL",
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/equipe");
  redirect("/equipe");
}
