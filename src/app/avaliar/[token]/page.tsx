import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/ui/public-shell";
import { feedbackByToken } from "@/modules/core/application/public-links";
import { feedbackAction } from "@/modules/core/ui/public-link-actions";

export const metadata = { title: "Como foi o seu atendimento?", robots: { index: false, follow: false } };

const FACES = ["😞", "😕", "😐", "🙂", "😍"];

export default async function AvaliarPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string }> }) {
  const { token } = await params;
  const { r } = await searchParams;
  const data = await feedbackByToken(token);
  if (!data) notFound();
  const { appt: a, salon, given, open } = data;
  const name = (a.clientName ?? a.walkInName ?? "").split(" ")[0];
  const pro = a.professionalNick ?? a.professionalName;

  if (!open && !given) {
    return (
      <PublicShell salon={salon}>
        <div className="card text-center">
          <p className="text-sm text-ink-2">A avaliação abre depois do atendimento (e fica disponível por 30 dias).</p>
          <Link href={`/h/${token}`} className="btn btn-secondary mt-4 w-full">Ver meu horário</Link>
        </div>
      </PublicShell>
    );
  }

  if (r === "obrigada") {
    return (
      <PublicShell salon={salon}>
        <div className="card text-center">
          <div className="text-4xl">💕</div>
          <h1 className="mt-2 text-xl font-extrabold">Obrigada{name ? `, ${name}` : ""}!</h1>
          <p className="mt-1 text-sm text-ink-2">Sua opinião chegou para o {salon.salonName}.</p>
          {salon.onlineBooking && <Link href={`/agendar/${salon.slug}`} className="btn btn-primary mt-4 w-full">Agendar o próximo horário</Link>}
        </div>
      </PublicShell>
    );
  }

  if (given && (r === "nota" || !open)) {
    const happy = given.score >= 4;
    return (
      <PublicShell salon={salon}>
        <div className="card text-center">
          <div className="text-4xl">{FACES[given.score - 1]}</div>
          <h1 className="mt-2 text-xl font-extrabold">{happy ? "Que bom que você gostou!" : "Obrigada por contar."}</h1>
          <p className="mt-1 text-sm text-ink-2">{happy ? `Vamos passar o carinho para ${pro}.` : "O salão vai ler com atenção. O que podemos melhorar?"}</p>
          {happy && salon.reviewUrl && (
            <a href={salon.reviewUrl} target="_blank" rel="noopener" className="btn btn-primary mt-4 w-full">⭐ Contar isso no Google (ajuda muito o salão)</a>
          )}
        </div>
        {open && (
          <form action={feedbackAction} className="card mt-4 space-y-3">
            <input type="hidden" name="token" value={token} />
            <label className="block text-sm font-semibold" htmlFor="comment">{happy ? "Quer deixar um recado? (opcional)" : "Conte o que aconteceu (opcional)"}</label>
            <textarea id="comment" name="comment" rows={3} maxLength={1000} className="field" defaultValue={given.comment ?? ""} placeholder={happy ? "Ex.: amei o resultado!" : "Ex.: atrasou, o corte ficou curto…"} />
            <button className="btn btn-secondary w-full">Enviar</button>
          </form>
        )}
      </PublicShell>
    );
  }

  return (
    <PublicShell salon={salon}>
      <div className="card text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-brand">{name ? `${name}, ` : ""}como foi?</div>
        <h1 className="mt-2 text-xl font-extrabold">{a.serviceName} com {pro}</h1>
        <p className="mt-1 text-sm text-muted">Toque numa nota. Leva 5 segundos.</p>
        <form action={feedbackAction} className="mt-5 grid grid-cols-5 gap-2">
          <input type="hidden" name="token" value={token} />
          {FACES.map((f, i) => (
            <button key={i} name="score" value={i + 1} aria-label={`Nota ${i + 1}`} className={`flex flex-col items-center rounded-2xl border border-line bg-white py-3 text-3xl transition hover:-translate-y-0.5 hover:border-brand ${given?.score === i + 1 ? "border-brand ring-2 ring-brand/30" : ""}`}>
              {f}
              <span className="mt-1 text-xs font-bold text-muted">{i + 1}</span>
            </button>
          ))}
        </form>
      </div>
    </PublicShell>
  );
}
