import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getActor } from "@/modules/core/application/auth";
import { signupAction } from "@/modules/core/ui/actions";
import { SignupForm } from "@/modules/core/ui/signup-form";
import { SEGMENTS } from "@/modules/catalog/domain/presets";

export const metadata = { title: "Teste grátis de 30 dias" };

export default async function SignupPage() {
  if (await getActor()) redirect("/painel");
  const segments = Object.entries(SEGMENTS).map(([key, v]) => ({ key, label: v.label, services: v.services }));
  return (
    <main className="min-h-dvh bg-mist px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <Logo size={36} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Teste o gradeo beauty por 30 dias</h1>
          <p className="text-sm text-muted">Configure seu negócio em 3 minutos e use todos os recursos do plano Pro: agenda, comanda, caixa, estoque e comissões. Sem cartão e sem fidelidade.</p>
        </div>
        <div className="card">
          <SignupForm segments={segments} action={signupAction} />
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
