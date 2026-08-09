"use client";

import { useActionState } from "react";
import type { ProposalState } from "@/app/[locale]/players/proposal-actions";

export function ValueProposalForm({
  action,
  playerId,
  playerSlug,
  suggestion,
  labels,
}: {
  action: (state: ProposalState, formData: FormData) => Promise<ProposalState>;
  playerId: string;
  playerSlug: string;
  /** The current published value, offered as a starting point. */
  suggestion: number | null;
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<ProposalState, FormData>(
    action,
    undefined,
  );

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        {labels.title}
      </summary>

      <form action={formAction} className="space-y-4 border-t border-border p-4">
        <input type="hidden" name="playerId" value={playerId} />
        <input type="hidden" name="playerSlug" value={playerSlug} />

        <div>
          <label htmlFor="valueUsd" className="block text-sm font-medium">
            {labels.value} <span className="text-danger">*</span>
          </label>
          <input
            id="valueUsd"
            name="valueUsd"
            type="number"
            required
            min={500}
            defaultValue={suggestion ?? undefined}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">{labels.valueHint}</p>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium">
            {labels.comment}
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">{labels.commentHint}</p>
        </div>

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
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {isPending ? labels.pending : labels.submit}
        </button>
      </form>
    </details>
  );
}
