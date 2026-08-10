"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/app/admin/actions";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Mot de passe administrateur
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {isPending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
