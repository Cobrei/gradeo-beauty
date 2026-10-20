import { MirrorO } from "./logo";

/** Iniciais do salão para quando não há logo (ex.: "Studio Bela" → "SB"). */
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "•";
}

/**
 * A marca do SALÃO em primeiro plano: logo enviada pela dona ou, sem logo, as iniciais na cor do salão.
 * "gradeo beauty" nunca concorre com ela; aparece só como assinatura discreta (PoweredBy).
 */
export function SalonMark({ name, logo, color, size = 40, tone = "light", showName = true, className = "" }: { name: string; logo?: string | null; color?: string | null; size?: number; tone?: "light" | "dark"; showName?: boolean; className?: string }) {
  const accent = color || "#b8475f";
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} style={{ height: size, maxWidth: size * 3.2 }} className="w-auto shrink-0 object-contain" />
      ) : (
        <span className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white" style={{ width: size, height: size, background: accent, fontSize: size * 0.4 }} aria-hidden>
          {initials(name)}
        </span>
      )}
      {showName && <span className={`truncate font-extrabold tracking-tight ${tone === "dark" ? "text-white" : "text-ink"}`} style={{ fontSize: Math.max(14, size * 0.42) }}>{name}</span>}
    </span>
  );
}

/** Assinatura discreta da plataforma. */
export function PoweredBy({ tone = "light", label = "feito com", className = "" }: { tone?: "light" | "dark"; label?: string; className?: string }) {
  const c = tone === "dark" ? "text-white/45" : "text-muted";
  return (
    <a href="https://gradeo-beauty.vercel.app" target="_blank" rel="noopener" className={`inline-flex items-center gap-1 text-[11px] ${c} hover:opacity-80 ${className}`}>
      {label} <span className="font-bold">grade</span>
      <MirrorO size={10} ring={tone === "dark" ? "#e58aa0" : "#b8475f"} />
      <span className="font-semibold">beauty</span>
    </a>
  );
}
