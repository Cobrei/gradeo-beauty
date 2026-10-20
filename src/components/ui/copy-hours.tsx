"use client";
import { useRef, useState } from "react";

/**
 * "Mesmo horário em todos os dias": copia a abertura/fechamento do primeiro dia marcado
 * (começando pela segunda) para os outros dias marcados do mesmo formulário.
 */
export function CopyHoursButton({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [done, setDone] = useState(false);
  function copy() {
    const form = ref.current?.closest("form");
    if (!form) return;
    const get = (n: string) => form.querySelector<HTMLInputElement>(`input[name="${n}"]`);
    const order = [1, 2, 3, 4, 5, 6, 0];
    const src = order.find((d) => get(`wd_${d}`)?.checked);
    if (src === undefined) return;
    const open = get(`open_${src}`)?.value;
    const close = get(`close_${src}`)?.value;
    for (const d of order) {
      if (d === src || !get(`wd_${d}`)?.checked) continue;
      const o = get(`open_${d}`);
      const c = get(`close_${d}`);
      if (o && open) o.value = open;
      if (c && close) c.value = close;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }
  return (
    <button ref={ref} type="button" onClick={copy} className={`btn btn-secondary btn-sm ${className}`}>
      {done ? "✓ Horário copiado" : "Mesmo horário em todos os dias"}
    </button>
  );
}
