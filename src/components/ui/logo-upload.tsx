"use client";
import { useRef, useState } from "react";

/**
 * Envio da logo do salão: reduz no próprio navegador (até 480 px, PNG com transparência)
 * e manda como texto no formulário. Sem serviço de arquivos, sem custo.
 */
export function LogoUpload({ initial, color }: { initial?: string | null; color?: string | null }) {
  const [data, setData] = useState<string>(initial ?? "");
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function onFile(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return setErr("Envie PNG, JPG, WEBP ou SVG.");
    if (f.size > 8 * 1024 * 1024) return setErr("Imagem muito grande (máximo 8 MB).");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      let out = c.toDataURL("image/png");
      if (out.length > 280_000) out = c.toDataURL("image/webp", 0.9);
      if (out.length > 280_000) return setErr("Não deu para reduzir a imagem. Tente uma versão mais simples da logo.");
      setData(out);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setErr("Não consegui ler essa imagem.");
    img.src = url;
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-line bg-[repeating-conic-gradient(#f6f1f3_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">
        {data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data} alt="Logo do salão" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-center text-xs text-muted">sem logo<br />(usamos as iniciais)</span>
        )}
      </div>
      <div className="space-y-2">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>{data ? "Trocar logo" : "Enviar logo"}</button>
          {data && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setData("")}>Remover</button>}
        </div>
        <p className="text-xs text-muted">PNG com fundo transparente fica melhor. Aparece no seu link de agendamento, no recibo, na confirmação de horário e no topo do sistema.</p>
        {err && <p className="text-xs font-semibold text-bad">{err}</p>}
        <label className="flex items-center gap-2 text-sm">
          Cor do salão <input type="color" name="brandColor" defaultValue={color || "#b8475f"} className="h-8 w-12 cursor-pointer rounded border border-line" />
        </label>
      </div>
      <input type="hidden" name="logoData" value={data} />
    </div>
  );
}
