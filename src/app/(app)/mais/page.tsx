import { ModuleGrid } from "@/components/ui/modules";
import { requireActor } from "@/modules/core/application/auth";

export const metadata = { title: "Mais" };

/** Todos os módulos, para o celular: a barra de baixo só comporta cinco. */
export default async function MorePage() {
  const actor = await requireActor();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mais</h1>
        <p className="text-sm text-muted">Tudo que o seu acesso alcança</p>
      </div>
      <ModuleGrid actor={actor} withHints />
    </div>
  );
}
