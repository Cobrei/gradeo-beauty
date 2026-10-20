"use server";
import { redirect } from "next/navigation";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { confirmByToken, saveFeedbackByToken } from "../application/public-links";

export async function confirmPresenceAction(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const res = (await withinLimit(`confirm:ip:${await clientIp()}`, 20, 600)) ? await confirmByToken(token) : "invalid";
  redirect(res === "invalid" ? `/h/${token}` : `/h/${token}?r=ok`);
}

export async function feedbackAction(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const raw = Number(fd.get("score"));
  const score = Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null;
  const comment = fd.get("comment") === null ? null : String(fd.get("comment"));
  const ok = (await withinLimit(`feedback:ip:${await clientIp()}`, 30, 600)) ? await saveFeedbackByToken(token, score, comment) : "invalid";
  redirect(ok === "ok" ? `/avaliar/${token}?r=${comment !== null ? "obrigada" : "nota"}` : `/avaliar/${token}`);
}
