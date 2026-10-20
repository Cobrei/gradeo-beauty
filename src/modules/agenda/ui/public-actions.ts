"use server";
import { redirect } from "next/navigation";
import { DomainError, toActionError } from "@/lib/errors";
import { clientIp, LIMIT_MSG, withinLimit } from "@/lib/rate-limit";
import { publicBook } from "../application/public-booking";

export async function publicBookAction(fd: FormData) {
  const slug = String(fd.get("slug"));
  const p = { serviceId: String(fd.get("serviceId")), professionalId: String(fd.get("professionalId")), date: String(fd.get("date")), time: String(fd.get("time")) };
  try {
    if (!(await withinLimit(`book:ip:${await clientIp()}`, 6, 600))) throw new DomainError("RATE_LIMIT", LIMIT_MSG);
    await publicBook(slug, { ...p, name: String(fd.get("name") || ""), phone: String(fd.get("phone") || ""), notes: (fd.get("notes") as string) || undefined });
  } catch (e) {
    const r = toActionError(e);
    const u = new URLSearchParams({ s: p.serviceId, p: p.professionalId, d: p.date, t: p.time, erro: r.ok ? "" : r.message });
    redirect(`/agendar/${slug}?${u.toString()}`);
  }
  redirect(`/agendar/${slug}?ok=1`);
}
