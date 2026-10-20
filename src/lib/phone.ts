/** Telefone brasileiro: guarda só dígitos com DDD (10 ou 11), exibe formatado. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;
  return d;
}

export function formatPhone(d: string | null | undefined): string {
  if (!d) return "";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function waNumber(d: string): string {
  return d.length <= 11 ? `55${d}` : d;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Primeiro nome com inicial maiúscula, para mensagens. */
export function firstName(full: string): string {
  const f = full.trim().split(/\s+/)[0] ?? "";
  return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
}
