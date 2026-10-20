/**
 * Erros de domínio voltam com código estável e mensagem em português
 * (regra do Esquadrão: validação em 3 camadas, erro legível ao usuário).
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(action: string) {
    super("AUTH_FORBIDDEN", "Você não tem permissão para esta ação.", { action });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super("NOT_FOUND", "Registro não encontrado.", { entity, id });
    this.name = "NotFoundError";
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export function toActionError(e: unknown): ActionResult<never> {
  if (e instanceof DomainError) return { ok: false, code: e.code, message: e.message };
  if (e && typeof e === "object" && "issues" in e) {
    // ZodError
    const fieldErrors: Record<string, string> = {};
    for (const issue of (e as { issues: { path: PropertyKey[]; message: string }[] }).issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, code: "VALIDATION", message: "Confira os campos destacados.", fieldErrors };
  }
  console.error(e);
  return { ok: false, code: "INTERNAL", message: "Algo deu errado. Tente novamente." };
}
