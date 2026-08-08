"use client";

import { useActionState, useState } from "react";
import type { AuthState } from "@/app/[locale]/account/actions";

type Option = { value: string; label: string };

export function OrganisationForm({
  action,
  submitLabel,
  clubs,
  labels,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  clubs: Option[];
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const [type, setType] = useState("CLUB");

  // An agency represents players, not a club, so the club picker is irrelevant
  // for it — and the licence field becomes the meaningful one instead.
  const isAgency = type === "AGENCY";

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="type" className="block text-sm font-medium">
          {labels.type} <span className="text-danger">*</span>
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="CLUB">{labels.typeClub}</option>
          <option value="ACADEMY">{labels.typeAcademy}</option>
          <option value="AGENCY">{labels.typeAgency}</option>
        </select>
      </div>

      <Text name="name" label={labels.name} required />

      {!isAgency && (
        <div>
          <label htmlFor="clubId" className="block text-sm font-medium">
            {labels.club} <span className="text-danger">*</span>
          </label>
          <select
            id="clubId"
            name="clubId"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">{labels.clubPlaceholder}</option>
            {clubs.map((club) => (
              <option key={club.value} value={club.value}>
                {club.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">{labels.clubHint}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="email" label={labels.email} type="email" required />
        <Text name="phone" label={labels.phone} type="tel" />
        <Text name="country" label={labels.country} />
        <Text name="city" label={labels.city} />
        <Text name="websiteUrl" label={labels.website} type="url" />
        <Text
          name="registration"
          label={labels.registration}
          hint={labels.registrationHint}
        />
      </div>

      <div>
        <label htmlFor="claimNote" className="block text-sm font-medium">
          {labels.claimNote}
        </label>
        <textarea
          id="claimNote"
          name="claimNote"
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">{labels.claimNoteHint}</p>
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {isPending ? labels.pending : submitLabel}
      </button>
    </form>
  );
}

function Text({
  name,
  label,
  type = "text",
  required,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
