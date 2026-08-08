"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/[locale]/account/actions";

export function AuthForm({
  action,
  submitLabel,
  withName = false,
  labels,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  withName?: boolean;
  labels: {
    fullName: string;
    email: string;
    password: string;
    passwordHint: string;
    pending: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {withName && (
        <Field name="fullName" label={labels.fullName} type="text" autoComplete="name" />
      )}
      <Field
        name="email"
        label={labels.email}
        type="email"
        required
        autoComplete="email"
      />
      <Field
        name="password"
        label={labels.password}
        type="password"
        required
        autoComplete={withName ? "new-password" : "current-password"}
        hint={withName ? labels.passwordHint : undefined}
      />

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p className="rounded-md bg-brand/10 p-3 text-sm text-brand" role="status">
          {state.notice}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {isPending ? labels.pending : submitLabel}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type,
  required,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
