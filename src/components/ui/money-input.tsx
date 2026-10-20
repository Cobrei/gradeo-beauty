"use client";
import { useState } from "react";

const fmt = (cents: number) => "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toCentsLoose(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 100);
  let s = v.replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Campo de dinheiro no formato brasileiro: a pessoa digita só números e vê "R$ 120,00".
 * O valor enviado é o texto formatado; o servidor lê com toCents (aceita "R$ 1.234,56").
 * defaultValue em reais (número ou texto como "90.0000" vindo do banco).
 */
export function MoneyInput({ name, id, defaultValue, required, className = "field", placeholder, emptyAsBlank }: { name: string; id?: string; defaultValue?: string | number | null; required?: boolean; className?: string; placeholder?: string; emptyAsBlank?: boolean }) {
  const initial = defaultValue === undefined || defaultValue === null || defaultValue === "" ? null : toCentsLoose(defaultValue);
  const [cents, setCents] = useState<number | null>(initial);
  return (
    <input
      id={id ?? name}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      required={required}
      className={`${className} tabular-nums`}
      placeholder={placeholder ?? "R$ 0,00"}
      value={cents === null ? (emptyAsBlank ? "" : "") : fmt(cents)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
        setCents(digits ? Number(digits) : null);
      }}
      onFocus={(e) => requestAnimationFrame(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length))}
    />
  );
}
