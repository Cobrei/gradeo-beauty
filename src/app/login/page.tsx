import Link from "next/link";
import { redirect } from "next/navigation";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/ui/logo";
import { Form } from "@/components/ui/form";
import { Field } from "@/components/ui";
import { getActor } from "@/modules/core/application/auth";
import { loginAction } from "@/modules/core/ui/actions";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if (await getActor()) redirect("/painel");
  const demo = (await searchParams).demo === "1";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <h1 className="mb-1">
            <Logo size={40} tone="dark" />
          </h1>
          <p className="text-sm text-white/70">{BRAND.tagline}</p>
        </div>
        {demo && <p className="mb-3 rounded-xl bg-white/10 px-3 py-2 text-center text-sm text-white">Salão de demonstração: é só tocar em Entrar.</p>}
        <div className="card">
          <Form action={loginAction} submitLabel="Entrar">
            <>
              <Field label="E-mail" name="email">
                <input id="email" name="email" type="email" autoComplete="username" required defaultValue={demo ? "dona@salao.demo" : undefined} className="field" />
              </Field>
              <Field label="Senha" name="password">
                <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo ? "gradeo123" : undefined} className="field" />
              </Field>
            </>
          </Form>
        </div>
        <p className="mt-5 text-center text-sm text-white/70">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-white underline">
            Criar meu salão grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
