"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

/** Campo de busca que filtra a lista enquanto digita (atualiza o ?q= da página). */
export function LiveSearch({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(sp.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onChange(val: string) {
    setV(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (val.trim()) p.set(param, val.trim());
      else p.delete(param);
      router.replace(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false });
    }, 250);
  }
  return <input value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" autoComplete="off" />;
}
