"use client";
import { useEffect } from "react";

/** Ao abrir a agenda de hoje, rola até a linha do horário atual. */
export function ScrollToNow() {
  useEffect(() => {
    const el = document.getElementById("agora");
    if (el) el.scrollIntoView({ block: "center" });
  }, []);
  return null;
}
