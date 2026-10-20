"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Seta "Voltar" no topo de todas as telas internas (menos o Início). */
export function BackBar() {
  const path = usePathname();
  const router = useRouter();
  const first = useRef<string | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (first.current === null) first.current = path;
    else if (path !== first.current) moved.current = true;
  }, [path]);
  if (path === "/painel") return null;
  function back() {
    // já navegou dentro do sistema: volta uma tela; entrou direto por link: vai para o Início
    if (moved.current) router.back();
    else router.push("/painel");
  }
  return (
    <button type="button" onClick={back} className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ink-2 hover:bg-mist hover:text-brand" aria-label="Voltar para a tela anterior">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Voltar
    </button>
  );
}
