import type { CSSProperties } from "react";

/** Variáveis de cor com a cor do salão (botões, destaques, seleção). Sem cor: tema padrão. */
export function brandStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return undefined;
  return { "--color-brand": color, "--color-brand-soft": `color-mix(in srgb, ${color} 13%, white)` } as CSSProperties;
}
