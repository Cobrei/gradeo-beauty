import type { ImportRow } from "../application/use-cases";

/**
 * Lê CSV/TSV/texto colado (Google Contacts, exportação de outros sistemas, planilha).
 * Detecta colunas por nome; sem cabeçalho assume: nome, telefone, e-mail, nascimento, última visita.
 * Também aceita vCard simples (.vcf) exportado do celular.
 */
export function parseCsv(text: string): ImportRow[] {
  const t = text.replace(/^﻿/, "");
  if (/BEGIN:VCARD/i.test(t)) return parseVcf(t);
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = detectSep(lines[0]);
  const first = split(lines[0], sep).map((h) => norm(h));
  const hasHeader = first.some((h) => /nome|name|telefone|phone|celular|whatsapp|e-?mail/.test(h));
  const idx = {
    name: hasHeader ? first.findIndex((h) => /^(nome|name|cliente|given name|first name|full name)/.test(h)) : 0,
    last: hasHeader ? first.findIndex((h) => /(sobrenome|family name|last name)/.test(h)) : -1,
    // Google Contatos traz "Phone 1 - Label" (Mobile) antes de "Phone 1 - Value": ignora colunas de rótulo/tipo
    phone: hasHeader ? first.findIndex((h) => /(telefone|phone|celular|whatsapp|fone|mobile)/.test(h) && !/(label|type|tipo|rotulo)/.test(h)) : 1,
    email: hasHeader ? first.findIndex((h) => /e-?mail/.test(h) && !/(label|type|tipo|rotulo)/.test(h)) : 2,
    birth: hasHeader ? first.findIndex((h) => /(nascimento|birthday|aniversario|birth)/.test(h)) : 3,
    last_visit: hasHeader ? first.findIndex((h) => /(ultima|last visit|ultimo atendimento|visita)/.test(h)) : 4,
    notes: hasHeader ? first.findIndex((h) => /(obs|notes|notas|observa)/.test(h)) : -1,
  };
  if (hasHeader && idx.name < 0) idx.name = 0;
  const out: ImportRow[] = [];
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cols = split(line, sep);
    const name = [cols[idx.name], idx.last >= 0 ? cols[idx.last] : ""].filter(Boolean).join(" ").trim();
    const phone = idx.phone >= 0 ? cols[idx.phone] : undefined;
    if (!name && !phone) continue;
    out.push({ fullName: name || "Sem nome", phone, email: pick(cols, idx.email), birthDate: toISO(pick(cols, idx.birth)), lastVisitAt: toISO(pick(cols, idx.last_visit)), notes: pick(cols, idx.notes) });
  }
  return out;
}

function parseVcf(t: string): ImportRow[] {
  const cards = t.split(/BEGIN:VCARD/i).slice(1);
  return cards
    .map((c) => {
      const fn = /^FN[^:]*:(.+)$/im.exec(c)?.[1]?.trim();
      const tel = /^TEL[^:]*:(.+)$/im.exec(c)?.[1]?.trim();
      const email = /^EMAIL[^:]*:(.+)$/im.exec(c)?.[1]?.trim();
      const bday = /^BDAY[^:]*:(\d{4})-?(\d{2})-?(\d{2})/im.exec(c);
      return { fullName: fn ?? "", phone: tel, email, birthDate: bday ? `${bday[1]}-${bday[2]}-${bday[3]}` : undefined } as ImportRow;
    })
    .filter((r) => r.fullName && r.phone);
}

function detectSep(line: string): string {
  const counts = [",", ";", "\t", "|"].map((s) => [s, line.split(s).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function split(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === sep && !q) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const pick = (cols: string[], i: number) => (i >= 0 ? cols[i] || undefined : undefined);

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd → aaaa-mm-dd; data impossível (31/02) vira vazia em vez de derrubar a importação */
export function toISO(s?: string): string | undefined {
  if (!s) return undefined;
  let y: number, mo: number, d: number;
  const m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s.trim());
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (m) {
    d = Number(m[1]);
    mo = Number(m[2]);
    y = Number(m[3]);
    if (m[3].length === 2) y += y > Number(String(new Date().getFullYear()).slice(2)) ? 1900 : 2000;
  } else if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
  } else return undefined;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900 || y > 2100) return undefined;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
