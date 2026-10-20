import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/ui/public-shell";
import { receiptByToken } from "@/modules/core/application/public-links";
import { PAYMENT_METHODS } from "@/modules/pos/domain/rules";
import { formatBRL, toCents } from "@/lib/money";
import { formatBR } from "@/lib/dates";

export const metadata = { title: "Recibo", robots: { index: false, follow: false } };

export default async function ReciboPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await receiptByToken(token);
  if (!data) notFound();
  const { order: o, items, payments, salon } = data;
  const name = (o.clientName ?? o.walkInName ?? "").split(" ")[0];
  const discounts = toCents(o.discount) + toCents(o.voucherDiscount);
  return (
    <PublicShell salon={salon}>
      <div className="card">
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand">Recibo</div>
            <div className="text-lg font-bold">Comanda #{o.number}</div>
          </div>
          <div className="text-right text-sm text-muted">{formatBR(o.serviceDate)}{name ? <><br />{name}</> : null}</div>
        </div>
        <ul className="divide-y divide-line">
          {items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold">{i.description}</span>
                {Number(i.qty) > 1 && <span className="text-muted"> ×{Number(i.qty)}</span>}
                {(i.professional || i.professionalName) && <span className="block text-xs text-muted">com {i.professional ?? i.professionalName}</span>}
              </span>
              <span className="whitespace-nowrap tabular-nums">{formatBRL(toCents(i.total))}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          {discounts > 0 && <div className="flex justify-between text-muted"><span>Descontos</span><span className="tabular-nums">− {formatBRL(discounts)}</span></div>}
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="tabular-nums">{formatBRL(toCents(o.total))}</span></div>
          {payments.map((p, k) => (
            <div key={k} className="flex justify-between text-muted">
              <span>{PAYMENT_METHODS[p.method] ?? p.method}{p.installments > 1 ? ` em ${p.installments}x` : ""}</span>
              <span className="tabular-nums">{formatBRL(toCents(p.amount))}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-ink-2">Obrigada pela visita{name ? `, ${name}` : ""}! 💕</p>
      <div className="mt-4 grid gap-2">
        {salon.reviewUrl && <a href={salon.reviewUrl} target="_blank" rel="noopener" className="btn btn-primary w-full">Avaliar o {salon.salonName}</a>}
        {salon.onlineBooking && <Link href={`/agendar/${salon.slug}`} className="btn btn-secondary w-full">Agendar o próximo horário</Link>}
      </div>
    </PublicShell>
  );
}
