"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { MatchState } from "@/app/[locale]/account/org/match-actions";

type Option = { value: string; label: string };

export function MatchForm({
  action,
  orgSlug,
  clubName,
  opponents,
  competitions,
  seasons,
  ageCategories,
  labels,
}: {
  action: (state: MatchState, formData: FormData) => Promise<MatchState>;
  orgSlug: string;
  clubName: string;
  opponents: Option[];
  competitions: Option[];
  seasons: Option[];
  ageCategories: Option[];
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<MatchState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      <fieldset>
        <legend className="text-sm font-medium">{labels.venueType}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="isHome" value="1" defaultChecked />
            {labels.home}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="isHome" value="0" />
            {labels.away}
          </label>
        </div>
        <p className="mt-1 text-xs text-muted">
          {labels.yourClub} : <strong>{clubName}</strong>
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="opponentId"
          label={labels.opponent}
          placeholder={labels.choose}
          options={opponents}
          required
        />
        <Field name="date" label={labels.date} type="date" required />
        <Select
          name="competitionId"
          label={labels.competition}
          placeholder={labels.choose}
          options={competitions}
          required
        />
        <Select
          name="seasonId"
          label={labels.season}
          placeholder={labels.choose}
          options={seasons}
          required
        />
        <Field name="ownScore" label={labels.ownScore} type="number" />
        <Field name="opponentScore" label={labels.opponentScore} type="number" />
        <Select
          name="ageCategory"
          label={labels.ageCategory}
          placeholder={labels.senior}
          options={ageCategories}
        />
        <Field name="matchday" label={labels.matchday} type="number" />
        <Field name="venue" label={labels.stadium} />
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {isPending ? labels.pending : labels.submit}
        </button>
        <Link
          href={`/fr/account/org/${orgSlug}/matches`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
    </div>
  );
}

function Select({
  name,
  label,
  placeholder,
  options,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
