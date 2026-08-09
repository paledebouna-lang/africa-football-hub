"use client";

import { useActionState, useState } from "react";
import type { OrgState } from "@/app/[locale]/account/org/actions";

type Option = { value: string; label: string };

export function OrgTransferForm({
  action,
  orgSlug,
  playerId,
  clubs,
  seasons,
  types,
  labels,
}: {
  action: (state: OrgState, formData: FormData) => Promise<OrgState>;
  orgSlug: string;
  playerId: string;
  clubs: Option[];
  seasons: Option[];
  types: Option[];
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<OrgState, FormData>(
    action,
    undefined,
  );
  const [direction, setDirection] = useState("IN");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="playerId" value={playerId} />

      <fieldset>
        <legend className="text-sm font-medium">{labels.direction}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="direction"
              value="IN"
              checked={direction === "IN"}
              onChange={() => setDirection("IN")}
            />
            {labels.arrival}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="direction"
              value="OUT"
              checked={direction === "OUT"}
              onChange={() => setDirection("OUT")}
            />
            {labels.departure}
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="otherClubId"
          label={direction === "IN" ? labels.fromClub : labels.toClub}
          placeholder={labels.noClub}
          options={clubs}
        />
        <Field name="date" label={labels.date} type="date" required />
        <Select
          name="type"
          label={labels.type}
          placeholder={labels.choose}
          options={types}
          defaultValue="PERMANENT"
        />
        <Select
          name="seasonId"
          label={labels.season}
          placeholder={labels.choose}
          options={seasons}
        />
        <Field name="feeUsd" label={labels.fee} type="number" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeeUndisclosed" className="h-4 w-4" />
        {labels.undisclosed}
      </label>

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
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: Option[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
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
