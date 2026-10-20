"use client";

import { useState } from "react";

type Props = {
  code: string;
  discount: string; // "10%" ou "R$ 20,00"
  until: string; // dd/mm/aaaa
  minOrder?: string;
  salonName: string;
  color: string;
  bookingUrl: string;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Arte 1080x1920 (formato Stories) com o cupom. */
async function makeStory(p: Props): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1920;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#7a3b5e";
  ctx.fillStyle = color; ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.arc(980, 180, 320, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(80, 1760, 260, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  ctx.font = "600 56px system-ui, sans-serif";
  wrap(ctx, p.salonName, 900).forEach((l, i) => ctx.fillText(l, 540, 330 + i * 68));
  ctx.font = "500 44px system-ui, sans-serif";
  ctx.fillText("PRESENTE PARA VOCÊ", 540, 620);
  ctx.font = "800 240px system-ui, sans-serif";
  ctx.fillText(p.discount, 540, 880);
  ctx.font = "500 52px system-ui, sans-serif";
  ctx.fillText("de desconto", 540, 960);
  // caixa do código
  ctx.fillStyle = "#fff";
  const bw = 760, bh = 190, bx = 160, by = 1080;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 36); ctx.fill();
  ctx.fillStyle = color; ctx.font = "500 36px system-ui, sans-serif";
  ctx.fillText("use o cupom", 540, by + 60);
  ctx.font = "800 92px ui-monospace, monospace";
  ctx.fillText(p.code, 540, by + 155);
  ctx.fillStyle = "#fff"; ctx.font = "500 42px system-ui, sans-serif";
  ctx.fillText(`Válido até ${p.until}`, 540, 1400);
  if (p.minOrder) ctx.fillText(`Pedido mínimo ${p.minOrder}`, 540, 1462);
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText("Agende pelo link na bio ✨", 540, 1640);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

export function ShareVoucher(p: Props) {
  const [msg, setMsg] = useState("");
  const text = `🎁 Cupom ${p.code}: ${p.discount} de desconto no ${p.salonName}! Válido até ${p.until}${p.minOrder ? ` (pedido mínimo ${p.minOrder})` : ""}. Agende: ${p.bookingUrl}`;

  async function share() {
    setMsg("");
    const blob = await makeStory(p);
    const file = blob ? new File([blob], `cupom-${p.code}.png`, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    // Computador: baixa a arte e copia a legenda
    if (blob) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `cupom-${p.code}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    try { await navigator.clipboard.writeText(text); } catch { /* sem permissão */ }
    setMsg("Arte baixada e legenda copiada. Poste no Instagram (Stories ou feed) e cole a legenda.");
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={share} className="text-xs font-semibold text-brand underline" title="Gera uma arte de Stories com o cupom">Instagram</button>
      {msg && <span className="mt-1 max-w-48 text-right text-[11px] text-muted">{msg}</span>}
    </span>
  );
}
