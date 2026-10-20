import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/ui/public-shell";
import { appointmentByToken } from "@/modules/core/application/public-links";
import { confirmPresenceAction } from "@/modules/core/ui/public-link-actions";
import { dateToLocal, formatLongDate } from "@/lib/time";

export const metadata = { title: "Seu horário", robots: { index: false, follow: false } };

export default async function HorarioPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string }> }) {
  const { token } = await params;
  const { r } = await searchParams;
  const data = await appointmentByToken(token);
  if (!data) notFound();
  const { appt: a, salon } = data;
  const l = dateToLocal(a.startsAt);
  const name = (a.clientName ?? a.walkInName ?? "").split(" ")[0];
  const past = a.startsAt.getTime() < Date.now();
  const status = a.status === "CONFIRMED" ? "Presença confirmada" : a.status === "REQUESTED" ? "Aguardando o salão confirmar" : a.status === "CANCELLED" ? "Horário cancelado" : a.status === "DONE" ? "Atendimento realizado" : a.status === "NO_SHOW" ? "Não compareceu" : "Horário marcado";
  const reschedule = salon.whatsapp
    ? `https://wa.me/55${salon.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Oi! Sou ${a.clientName ?? a.walkInName ?? ""} e preciso remarcar meu horário de ${a.serviceName} em ${l.date.split("-").reverse().join("/")} às ${l.time}.`)}`
    : null;
  return (
    <PublicShell salon={salon}>
      {r === "pedido" && <div className="mb-3 rounded-xl bg-gold-soft px-4 py-3 text-center text-sm font-semibold text-[#8a6420]">Pedido enviado! O {salon.salonName} vai confirmar pelo WhatsApp. Guarde este link para ver seu horário.</div>}
      {r === "ok" && <div className="mb-3 rounded-xl bg-ok-soft px-4 py-3 text-center text-sm font-semibold text-ok">Presença confirmada. Até lá! 💕</div>}
      <div className="card text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-brand">{name ? `${name}, seu horário` : "Seu horário"}</div>
        <div className="mt-2 text-2xl font-extrabold capitalize">{formatLongDate(l.date)}</div>
        <div className="text-4xl font-extrabold tabular-nums text-brand">{l.time}</div>
        <div className="mt-2 text-sm text-ink-2">{a.serviceName} com {a.professionalNick ?? a.professionalName}</div>
        <div className="mt-3 inline-flex rounded-full bg-mist px-3 py-1 text-xs font-bold text-ink-2">{status}</div>
      </div>
      <div className="mt-4 grid gap-2">
        {a.status === "SCHEDULED" && !past && (
          <form action={confirmPresenceAction}>
            <input type="hidden" name="token" value={token} />
            <button className="btn btn-primary w-full">Confirmar presença</button>
          </form>
        )}
        {reschedule && !past && !["CANCELLED", "DONE"].includes(a.status) && <a href={reschedule} target="_blank" rel="noopener" className="btn btn-secondary w-full">Preciso remarcar ou cancelar</a>}
        {salon.onlineBooking && (past || ["CANCELLED", "DONE"].includes(a.status)) && <Link href={`/agendar/${salon.slug}`} className="btn btn-secondary w-full">Agendar novo horário</Link>}
      </div>
    </PublicShell>
  );
}
