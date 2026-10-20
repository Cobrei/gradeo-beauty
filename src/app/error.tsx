"use client";
import Link from "next/link";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const semPermissao = /AUTH_FORBIDDEN|Forbidden|permiss/i.test(error.message);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-mist px-4">
      <div className="card max-w-md text-center">
        <h1 className="text-xl font-bold">{semPermissao ? "Seu acesso não inclui esta tela" : "Algo não saiu como esperado"}</h1>
        <p className="mt-2 text-sm text-ink-2">
          {semPermissao ? "Peça à dona do salão para liberar, se você precisar dela." : "Tente de novo. Se continuar, fale com a gente pelo WhatsApp (51) 99373-5007."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {!semPermissao && <button onClick={reset} className="btn btn-primary">Tentar de novo</button>}
          <Link href="/painel" className="btn btn-secondary">Ir para o início</Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-muted">Código: {error.digest}</p>}
      </div>
    </main>
  );
}
