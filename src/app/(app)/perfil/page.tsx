import { eq } from "drizzle-orm";
import { Card, PageHeader } from "@/components/ui";
import { users } from "@/db/schema";
import { requireActor } from "@/modules/core/application/auth";
import { saveNicknameAction } from "@/modules/core/ui/profile-actions";
import { withTenantRead } from "@/lib/context";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const actor = await requireActor();
  const [u] = await withTenantRead(actor, (tx) => tx.select({ name: users.name, email: users.email, nickname: users.nickname }).from(users).where(eq(users.id, actor.userId)).limit(1));
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Meu perfil" subtitle={`${u?.name ?? ""} · ${u?.email ?? ""}`} />
      <Card>
        <form action={saveNicknameAction} className="space-y-3">
          <label htmlFor="nickname" className="label">Como você quer ser chamado(a)?</label>
          <input id="nickname" name="nickname" maxLength={60} className="field" defaultValue={u?.nickname ?? ""} placeholder={u?.name.split(" ")[0] ?? "Ex.: Ana"} />
          <p className="text-xs text-muted">Aparece só para você, na saudação do sistema. Em branco, usamos o seu primeiro nome.</p>
          <button className="btn btn-primary">Salvar</button>
        </form>
      </Card>
    </div>
  );
}
