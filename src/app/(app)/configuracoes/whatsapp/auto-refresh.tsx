"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a página de tempos em tempos (QR code novo / detectar conexão). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
