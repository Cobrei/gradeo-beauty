"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { login, logout } from "../application/auth";
import { signup } from "../application/signup";
import { toActionError } from "@/lib/errors";
import { clientIp, LIMIT_MSG, withinLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/errors";

export async function loginAction(_prev: ActionResult<unknown> | null, formData: FormData): Promise<ActionResult<unknown>> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, code: "VALIDATION", message: "Informe e-mail e senha." };
  const ip = await clientIp();
  const okIp = await withinLimit(`login:ip:${ip}`, 20, 600);
  const okEmail = await withinLimit(`login:email:${email.toLowerCase().trim()}`, 8, 600);
  if (!okIp || !okEmail) return { ok: false, code: "RATE_LIMIT", message: LIMIT_MSG };
  const h = await headers();
  const r = await login(email, password, h.get("user-agent") ?? undefined);
  if (!r.ok) return { ok: false, code: "AUTH", message: r.message };
  redirect("/painel");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function signupAction(_prev: ActionResult<unknown> | null, formData: FormData): Promise<ActionResult<unknown>> {
  try {
    if (!(await withinLimit(`signup:ip:${await clientIp()}`, 5, 3600))) return { ok: false, code: "RATE_LIMIT", message: LIMIT_MSG };
    const h = await headers();
    await signup(
      {
        salonName: formData.get("salonName"),
        segments: formData.getAll("segments").map(String),
        ownerName: formData.get("ownerName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
        serviceNames: formData.getAll("serviceNames").map(String),
        professionals: formData.getAll("professionals").map(String).map((s) => s.trim()).filter(Boolean),
      },
      h.get("user-agent") ?? undefined,
    );
  } catch (e) {
    return toActionError(e);
  }
  redirect("/painel?bemvinda=1");
}
