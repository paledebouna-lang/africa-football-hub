"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createHeroVideoUpload, type ActionState } from "@/app/admin/actions";

const MAX_MB = 45;

/**
 * Home hero settings. The video is either a YouTube link or a file sent from
 * the admin's computer; either way the form only ever submits an address.
 */
export function HeroVideoForm({
  action,
  defaultUrl,
  defaultActive,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultUrl: string;
  defaultActive: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, undefined);
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setMessage(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setStatus("error");
      setMessage(`Fichier trop lourd (${MAX_MB} Mo maximum). Compresse-le d'abord.`);
      return;
    }

    setStatus("working");
    try {
      const extension = file.name.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
      const ticket = await createHeroVideoUpload(extension);
      const supabase = createSupabaseBrowserClient();
      if (!ticket.path || !ticket.token || !ticket.publicUrl || !supabase) {
        throw new Error(ticket.error ?? "Envoi indisponible.");
      }

      const { error } = await supabase.storage
        .from("site-videos")
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: extension === "webm" ? "video/webm" : "video/mp4",
        });
      if (error) throw new Error(error.message);

      setUrl(ticket.publicUrl);
      setStatus("idle");
      setMessage("Vidéo envoyée. Pense à cliquer sur « Enregistrer ».");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "L'envoi a échoué.");
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium">
          Vidéo d&apos;en-tête
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Colle un lien YouTube (l&apos;auteur doit autoriser l&apos;intégration), ou envoie un fichier
          vidéo ci-dessous. La vidéo se lit en boucle, sans le son, derrière le titre de l&apos;accueil.
          Laisse vide pour garder le fond bleu.
        </p>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={status === "working"}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand disabled:opacity-60"
        >
          {status === "working" ? "Envoi en cours..." : "Envoyer un fichier vidéo (MP4)"}
        </button>
        <p className="mt-1 text-xs text-muted">
          {MAX_MB} Mo maximum. Une vidéo courte, sans son, de préférence en 720p, se charge plus
          vite pour les visiteurs.
        </p>
        {message && (
          <p
            className={`mt-1 text-xs ${status === "error" ? "text-danger" : "text-brand"}`}
            role="status"
          >
            {message}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultActive}
          className="h-4 w-4 rounded border-border"
        />
        Afficher la vidéo sur la page d&apos;accueil
      </label>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || status === "working"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-60 transition-colors"
        >
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          Annuler
        </Link>
      </div>
    </form>
  );
}
