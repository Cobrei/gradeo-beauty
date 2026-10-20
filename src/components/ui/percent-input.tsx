"use client";
import { useState } from "react";
import { Field } from "@/components/ui";
import { MoneyInput } from "./money-input";

function clean(v: string, max?: number) {
  let s = v.replace(/[^\d,.]/g, "").replace(".", ",");
  const [i, ...rest] = s.split(",");
  s = rest.length ? `${i},${rest.join("").slice(0, 2)}` : i;
  if (max !== undefined && Number(s.replace(",", ".")) > max) s = String(max);
  return s;
}
const fromDefault = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(Number(v)).replace(".", ",");

/**
 * Campo de porcentagem: a pessoa vê "20%" (nunca só "20").
 * Envia o número puro ("20" ou "12.5") no campo `name`.
 */
export function PercentInput({ name, id, defaultValue, required, max = 100, placeholder = "0%", className = "field" }: { name: string; id?: string; defaultValue?: string | number | null; required?: boolean; max?: number; placeholder?: string; className?: string }) {
  const [v, setV] = useState(fromDefault(defaultValue));
  return (
    <>
      <input
        id={id ?? name}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        className={`${className} tabular-nums`}
        placeholder={placeholder}
        value={v ? `${v}%` : ""}
        onChange={(e) => setV(clean(e.target.value, max))}
        onKeyDown={(e) => {
          // Backspace logo depois do "%" apaga o último número
          if (e.key === "Backspace" && v && e.currentTarget.selectionStart === e.currentTarget.value.length) {
            e.preventDefault();
            setV(v.slice(0, -1));
          }
        }}
        onFocus={(e) => { const t = e.target; requestAnimationFrame(() => t.setSelectionRange(Math.max(0, t.value.length - 1), Math.max(0, t.value.length - 1))); }}
        onClick={(e) => { const t = e.currentTarget; if (t.value && t.selectionStart === t.value.length) t.setSelectionRange(t.value.length - 1, t.value.length - 1); }}
      />
      <input type="hidden" name={name} value={v.replace(",", ".")} />
    </>
  );
}

/**
 * Tipo de desconto + valor. O rótulo e o formato mudam com o tipo:
 * "Desconto (%)" mostra 20%; "Desconto (R$)" mostra R$ 20,00.
 * Sempre envia `valueName` como número puro (ex.: "20" ou "20.00").
 */
export function DiscountFields({ kindName, valueName, defaultKind = "PERCENT", defaultValue, allowNone, required }: { kindName: string; valueName: string; defaultKind?: string; defaultValue?: string | number | null; allowNone?: boolean; required?: boolean }) {
  const [kind, setKind] = useState(defaultKind);
  const [money, setMoney] = useState(defaultKind === "AMOUNT" && defaultValue ? Number(defaultValue).toFixed(2) : "");
  return (
    <>
      <Field label="Tipo de desconto" name={kindName}>
        <select id={kindName} name={kindName} className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
          {allowNone && <option value="">Sem voucher</option>}
          <option value="PERCENT">Em %</option>
          <option value="AMOUNT">Em R$</option>
        </select>
      </Field>
      {kind === "PERCENT" && (
        <Field label="Desconto (%)" name={valueName}>
          <PercentInput key="pct" name={valueName} required={required} placeholder="Ex.: 20%" defaultValue={defaultKind === "PERCENT" ? defaultValue : ""} />
        </Field>
      )}
      {kind === "AMOUNT" && (
        <Field label="Desconto (R$)" name={valueName}>
          <div onInput={(e) => { const t = e.target as HTMLInputElement; const d = t.value.replace(/\D/g, ""); setMoney(d ? (Number(d) / 100).toFixed(2) : ""); }}>
            <MoneyInput key="brl" name={`${valueName}__fmt`} id={valueName} required={required} defaultValue={money || null} />
          </div>
          <input type="hidden" name={valueName} value={money} />
        </Field>
      )}
      {kind === "" && <div />}
    </>
  );
}
