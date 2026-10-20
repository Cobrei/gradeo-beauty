import Link from "next/link";
import type { ReactNode } from "react";
import { FieldError } from "./form";

export type Tone = "brand" | "gold" | "ok" | "warn" | "bad" | "info" | "mist";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TONE_TEXT: Record<Tone, string> = { brand: "text-brand", gold: "text-gold", ok: "text-ok", warn: "text-warn", bad: "text-bad", info: "text-info", mist: "text-ink-2" };
const TONE_BG: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  gold: "bg-gold-soft text-[#8a6420]",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-[#9a5a12]",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  mist: "bg-mist text-ink-2",
};

export function Stat({ label, value, tone = "brand", hint, href }: { label: string; value: string | number; tone?: Tone; hint?: string; href?: string }) {
  const inner = (
    <>
      <div className={`whitespace-nowrap text-[clamp(1.05rem,12cqi,1.875rem)] font-bold leading-tight tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
      {hint && <div className="mt-1 text-xs text-ink-2">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card @container block min-w-0 hover:ring-2 hover:ring-brand/30">
      {inner}
    </Link>
  ) : (
    <div className="card @container min-w-0">{inner}</div>
  );
}

export function Badge({ children, tone = "mist" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${TONE_BG[tone]}`}>{children}</span>;
}

export function LinkButton({ href, children, variant = "primary", size }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "wa"; size?: "sm" }) {
  return (
    <Link href={href} className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""}`}>
      {children}
    </Link>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <div className="text-lg font-semibold">{title}</div>
      {hint && <p className="max-w-md text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Field({ label, name, children, errorKey, hint, className = "" }: { label: string; name: string; children: ReactNode; errorKey?: string; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <FieldError name={errorKey ?? name} />
    </div>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  const palette = ["#b8475f", "#d4a24c", "#5b6fb5", "#2f9a78", "#e08a2e", "#7a4f8a"];
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color ?? palette[idx], fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}

/** Link para o WhatsApp da cliente com texto pronto. */
export function WaLink({ phone, text, children, className = "btn btn-wa btn-sm" }: { phone: string | null | undefined; text?: string; children: ReactNode; className?: string }) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const href = `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  );
}

export function Tabs({ items, current }: { items: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <Link key={t.key} href={t.href} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${t.key === current ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
          {t.label}
          {t.count !== undefined && <span className="ml-1 text-xs text-muted">({t.count})</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${TONE_BG[tone]}`}>{children}</div>;
}
