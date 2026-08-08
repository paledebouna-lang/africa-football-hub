"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { OrgState } from "@/app/[locale]/account/org/actions";

type Option = { value: string; label: string };

export type OrgPlayerDefaults = {
  id?: string;
  name?: string;
  nameAr?: string | null;
  dateOfBirth?: string;
  position?: string | null;
  foot?: string | null;
  ageCategory?: string;
  squadLevel?: string;
  heightCm?: number | null;
  shirtNumber?: number | null;
  contractUntil?: string;
  nationalityId?: string | null;
  photoUrl?: string | null;
};

export function OrgPlayerForm({
  action,
  orgSlug,
  countries,
  positions,
  feet,
  ageCategories,
  squadLevels,
  defaults = {},
  labels,
}: {
  action: (state: OrgState, formData: FormData) => Promise<OrgState>;
  orgSlug: string;
  countries: Option[];
  positions: Option[];
  feet: Option[];
  ageCategories: Option[];
  squadLevels: Option[];
  defaults?: OrgPlayerDefaults;
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<OrgState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="name" label={labels.name} required defaultValue={defaults.name} />
        <Text
          name="nameAr"
          label={labels.nameAr}
          defaultValue={defaults.nameAr ?? ""}
        />
        <Select
          name="nationalityId"
          label={labels.nationality}
          placeholder={labels.none}
          options={countries}
          defaultValue={defaults.nationalityId ?? ""}
        />
        <Text
          name="dateOfBirth"
          label={labels.dateOfBirth}
          type="date"
          defaultValue={defaults.dateOfBirth ?? ""}
        />
        <Select
          name="position"
          label={labels.position}
          placeholder={labels.none}
          options={positions}
          defaultValue={defaults.position ?? ""}
        />
        <Select
          name="foot"
          label={labels.foot}
          placeholder={labels.none}
          options={feet}
          defaultValue={defaults.foot ?? ""}
        />
        <Select
          name="ageCategory"
          label={labels.ageCategory}
          placeholder={labels.none}
          options={ageCategories}
          defaultValue={defaults.ageCategory ?? "SENIOR"}
        />
        <Select
          name="squadLevel"
          label={labels.squadLevel}
          placeholder={labels.none}
          options={squadLevels}
          defaultValue={defaults.squadLevel ?? "FIRST_TEAM"}
          hint={labels.squadLevelHint}
        />
        <Text
          name="shirtNumber"
          label={labels.shirtNumber}
          type="number"
          defaultValue={
            defaults.shirtNumber === null || defaults.shirtNumber === undefined
              ? ""
              : String(defaults.shirtNumber)
          }
        />
        <Text
          name="heightCm"
          label={labels.height}
          type="number"
          defaultValue={
            defaults.heightCm === null || defaults.heightCm === undefined
              ? ""
              : String(defaults.heightCm)
          }
        />
        <Text
          name="contractUntil"
          label={labels.contractUntil}
          type="date"
          defaultValue={defaults.contractUntil ?? ""}
        />
        <Text
          name="photoUrl"
          label={labels.photo}
          type="url"
          defaultValue={defaults.photoUrl ?? ""}
          hint={labels.photoHint}
        />
      </div>

      <p className="rounded-md bg-brand/5 p-3 text-xs text-muted">
        {labels.valuationNote}
      </p>

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
          href={`/fr/account/org/${orgSlug}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}

function Text({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Select({
  name,
  label,
  placeholder,
  options,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: Option[];
  defaultValue?: string;
  hint?: string;
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
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
