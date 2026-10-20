"use client";
import Link from "next/link";
import { useState } from "react";
import type { HelpTopic } from "@/config/help";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Perguntas por tema com busca instantânea. */
export function HelpSearch({ topics }: { topics: HelpTopic[] }) {
  const [q, setQ] = useState("");
  const n = norm(q.trim());
  const filtered = topics.map((t) => ({ ...t, items: t.items.filter((i) => !n || norm(i.q + " " + i.a).includes(n)) })).filter((t) => t.items.length);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qual a sua dúvida? Ex.: comissão, bloquear, recibo…" className="field mb-4" />
      {filtered.length === 0 && <p className="text-sm text-muted">Nada encontrado. Fale com a gente pelo WhatsApp logo abaixo.</p>}
      <div className="space-y-5">
        {filtered.map((t) => (
          <section key={t.title}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">{t.title}</h2>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {t.items.map((i) => (
                <details key={i.q} open={!!n} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-semibold marker:hidden">
                    <span className="mr-2 inline-block text-brand transition group-open:rotate-90">›</span>
                    {i.q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{i.a}</p>
                  {i.href && <Link href={i.href} className="btn btn-secondary btn-sm mt-3">{i.cta ?? "Abrir"}</Link>}
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
