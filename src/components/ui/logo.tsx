// Marca gradeo beauty — o "o" final de gradeo vira um espelho: anel rosé com brilho dourado.
// Regra da família gradeo: a palavra "gradeo" nunca muda; só o "o" final carrega o produto.

/** O "o" espelho. */
export function MirrorO({ size = 24, ring = "#b8475f", shine = "#d4a24c", className, style }: { size?: number; ring?: string; shine?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden className={className} style={style}>
      <circle cx={26} cy={26} r={17} fill="none" stroke={ring} strokeWidth={8} />
      <path d="M15 19a13 13 0 0 1 9-7" fill="none" stroke={shine} strokeWidth={4.5} strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 28, tone = "light", product = "beauty" }: { size?: number; tone?: "light" | "dark"; product?: string | null }) {
  const ink = tone === "dark" ? "#ffffff" : "#231a29";
  const ring = tone === "dark" ? "#e58aa0" : "#b8475f";
  const sub = tone === "dark" ? "#e9c89a" : "#b8475f";
  return (
    <span className="inline-flex items-baseline" style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", lineHeight: 1, color: ink }} aria-label={`gradeo ${product ?? ""}`.trim()}>
      <span>grade</span>
      <MirrorO size={size * 0.86} ring={ring} style={{ position: "relative", top: size * 0.12, marginLeft: size * 0.04 }} />
      {product && <span style={{ marginLeft: size * 0.3, fontWeight: 600, fontSize: size * 0.62, letterSpacing: 0, color: sub }}>{product}</span>}
    </span>
  );
}
