"use client";
import { createContext, useActionState, useContext } from "react";
import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";

type Action = (prev: ActionResult<unknown> | null, formData: FormData) => Promise<ActionResult<unknown>>;
const ErrorsCtx = createContext<Record<string, string>>({});

/**
 * Único componente de cliente dos formulários: mostra erro geral e por campo
 * (via contexto), mantendo o resto da página renderizada no servidor (ADR-007).
 */
export function Form({ action, children, submitLabel = "Salvar", className = "" }: { action: Action; children: ReactNode; submitLabel?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <ErrorsCtx.Provider value={errors}>
      <form action={formAction} className={`space-y-4 ${className}`}>
        {state && !state.ok && (
          <div role="alert" className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
            {state.message}
          </div>
        )}
        {children}
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? "Salvando…" : submitLabel}
        </button>
      </form>
    </ErrorsCtx.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const errors = useContext(ErrorsCtx);
  const msg = errors[name];
  if (!msg) return null;
  return <p className="mt-1 text-xs font-semibold text-coral">{msg}</p>;
}
