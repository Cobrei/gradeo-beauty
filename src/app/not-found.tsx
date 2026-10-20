import Link from "next/link";
import { MirrorO } from "@/components/ui/logo";

export const metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-mist px-4">
      <div className="card max-w-md text-center">
        <div className="mb-3 flex justify-center"><MirrorO size={40} /></div>
        <h1 className="text-xl font-bold">Esta página não existe</h1>
        <p className="mt-2 text-sm text-ink-2">O link pode estar errado ou ter mudado.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/painel" className="btn btn-primary">Ir para o painel</Link>
          <Link href="/" className="btn btn-secondary">Site</Link>
        </div>
      </div>
    </main>
  );
}
