"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/app/admin/actions";
import { ImageUpload } from "@/components/image-upload";

// The admin is French-only, so its upload wording lives here rather than in the
// translation files that serve the public site.
const UPLOAD_LABELS = {
  choose: "Choisir une image",
  uploading: "Envoi en cours...",
  remove: "Retirer",
  noImage: "Aucune",
  done: "Image envoyée.",
  failed: "L'envoi a échoué.",
  signInRequired:
    "Connecte-toi d'abord à ton compte membre (bouton « Mon compte » sur le site) : l'envoi d'images utilise cette session.",
};

export type FieldOption = { value: string; label: string };

export type Field =
  | {
      kind: "text" | "number" | "date" | "url";
      name: string;
      label: string;
      required?: boolean;
      defaultValue?: string;
      hint?: string;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      required?: boolean;
      defaultValue?: string;
      hint?: string;
      placeholder: string;
      options: FieldOption[];
    }
  | {
      kind: "checkbox";
      name: string;
      label: string;
      defaultChecked?: boolean;
      hint?: string;
    }
  | {
      kind: "hidden";
      name: string;
      label: string;
      defaultValue?: string;
    }
  | {
      kind: "image";
      name: string;
      label: string;
      /** Sub-folder in the storage bucket, e.g. "clubs" or "players". */
      folder: string;
      defaultValue?: string | null;
      hint?: string;
      rounded?: boolean;
    };

export function AdminForm({
  action,
  fields,
  id,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  id?: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      {id && <input type="hidden" name="id" value={id} />}

      {fields
        .filter((field) => field.kind === "hidden")
        .map((field) => (
          <input
            key={field.name}
            type="hidden"
            name={field.name}
            value={field.defaultValue ?? ""}
          />
        ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {fields
          .filter((field) => field.kind !== "hidden")
          .map((field) => (
          <div
            key={field.name}
            className={
              field.kind === "checkbox" || field.kind === "image"
                ? "sm:col-span-2"
                : undefined
            }
          >
            {field.kind === "image" ? (
              <ImageUpload
                name={field.name}
                label={field.label}
                folder={field.folder}
                defaultValue={field.defaultValue}
                hint={field.hint}
                rounded={field.rounded}
                labels={UPLOAD_LABELS}
              />
            ) : field.kind === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={field.defaultChecked}
                  className="h-4 w-4 rounded border-border"
                />
                {field.label}
              </label>
            ) : (
              <>
                <label htmlFor={field.name} className="block text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-600"> *</span>}
                </label>

                {field.kind === "select" ? (
                  <select
                    id={field.name}
                    name={field.name}
                    required={field.required}
                    defaultValue={field.defaultValue ?? ""}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.kind === "url" ? "url" : field.kind}
                    required={field.required}
                    defaultValue={field.defaultValue}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                )}
              </>
            )}

            {field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>}
          </div>
          ))}
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-60 transition-colors"
        >
          {isPending ? "Enregistrement..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
