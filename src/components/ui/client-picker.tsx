"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatPhone } from "@/lib/phone";

type Row = { id: string; fullName: string; phone: string | null; visitsCount: number };

/**
 * Busca de cliente enquanto digita. Ao escolher, vai para o link do modelo
 * (`__ID__` é trocado pelo id da cliente).
 */
export function ClientPicker({ hrefTemplate, placeholder = "Digite o nome ou o telefone", autoFocus = true, emptyHint }: { hrefTemplate: string; placeholder?: string; autoFocus?: boolean; emptyHint?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const n = ++seq.current;
    timer.current = setTimeout(() => {
      fetch(`/api/clientes/busca?q=${encodeURIComponent(v.trim())}`)
        .then((r) => r.json())
        .then((d) => { if (n === seq.current) setRows(d.rows ?? []); })
        .catch(() => {})
        .finally(() => { if (n === seq.current) setLoading(false); });
    }, 200);
  }
  return (
    <div>
      <input value={q} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" autoFocus={autoFocus} autoComplete="off" />
      {q.trim().length >= 2 && (
        <ul className="mt-1 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => router.push(hrefTemplate.replace("__ID__", r.id))} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-mist">
                <span className="truncate text-sm font-semibold">{r.fullName}</span>
                <span className="shrink-0 text-xs text-muted">{formatPhone(r.phone)} · {r.visitsCount} visitas</span>
              </button>
            </li>
          ))}
          {loading && rows.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Buscando…</li>}
          {!loading && rows.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{emptyHint ?? "Ninguém com esse nome."}</li>}
        </ul>
      )}
    </div>
  );
}
