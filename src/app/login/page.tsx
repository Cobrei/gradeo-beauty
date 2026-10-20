import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/ui/logo";
import { Form } from "@/components/ui/form";
import { Field } from "@/components/ui";
import { getActor } from "@/modules/core/application/auth";
import { loginAction, logoutAction } from "@/modules/core/ui/actions";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const actor = await getActor();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <h1 className="mb-1">
            <Logo size={40} tone="dark" />
          </h1>
          <p className="text-sm text-white/70">{BRAND.tagline}</p>
        </div>
        {actor ? (
          <div className="card space-y-3 text-center">
            <p className="text-sm">Este aparelho já está conectado como <b>{actor.nickname}</b>.</p>
            <Link href="/painel" className="btn btn-primary w-full">Continuar no sistema</Link>
            <form action={logoutAction}><button className="btn btn-secondary w-full">Sair e entrar com outra conta</button></form>
          </div>
        ) : (
        <div className="card">
          <Form action={loginAction} submitLabel="Entrar">
            <>
              <Field label="E-mail" name="email">
                <input id="email" name="email" type="email" autoComplete="username" required className="field" />
              </Field>
              <Field label="Senha" name="password">
                <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name="remember" className="size-4" /> Manter conectado neste aparelho</label>
            </>
          </Form>
        </div>
        )}
        <p className="mt-5 text-center text-sm text-white/70">
          Ainda não usa o gradeo beauty?{" "}
          <Link href="/cadastro" className="font-semibold text-white underline">
            Comece o teste grátis de 30 dias
          </Link>
        </p>
      </div>
    </main>
  );
}
