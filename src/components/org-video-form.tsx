"use client";

import { useActionState } from "react";
import type { OrgState } from "@/app/[locale]/account/org/actions";

export function OrgVideoForm({
  action,
  orgSlug,
  playerId,
  types,
  labels,
}: {
  action: (state: OrgState, formData: FormData) => Promise<OrgState>;
  orgSlug: string;
  playerId: string;
  types: { value: string; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<OrgState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="playerId" value={playerId} />

      <div>
        <label htmlFor="url" className="block text-sm font-medium">
          {labels.url} <span className="text-danger">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">{labels.urlHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            {labels.title}
          </label>
          <input
            id="title"
            name="title"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            {labels.type}
          </label>
          <select
            id="type"
            name="type"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {isPending ? labels.pending : labels.submit}
      </button>
    </form>
  );
}
