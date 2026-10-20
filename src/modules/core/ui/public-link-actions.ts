"use server";
import { redirect } from "next/navigation";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { confirmByToken } from "../application/public-links";

export async function confirmPresenceAction(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const res = (await withinLimit(`confirm:ip:${await clientIp()}`, 20, 600)) ? await confirmByToken(token) : "invalid";
  redirect(res === "invalid" ? `/h/${token}` : `/h/${token}?r=ok`);
}
