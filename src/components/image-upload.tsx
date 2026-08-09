"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { missingConfigMessage } from "@/lib/supabase/config";

/**
 * Picks an image, shrinks it in the browser, uploads it, and writes the resulting
 * public address into a hidden field the surrounding form already submits.
 *
 * Resizing before upload is not a nicety: a phone photo is routinely 4-8 MB, and
 * a few hundred of those would exhaust the free storage tier while making every
 * squad table slow to load. A 900px crest is indistinguishable from the original
 * at the sizes actually displayed.
 */
const MAX_EDGE_PX = 900;
const JPEG_QUALITY = 0.82;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export function ImageUpload({
  name,
  label,
  folder,
  defaultValue,
  hint,
  labels,
  rounded = false,
}: {
  name: string;
  label: string;
  /** Sub-folder in the bucket, e.g. "players" or "clubs". */
  folder: string;
  defaultValue?: string | null;
  hint?: string;
  labels: Record<string, string>;
  rounded?: boolean;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("working");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setStatus("error");
        setMessage(missingConfigMessage());
        return;
      }

      const blob = await shrink(file);
      const path = `${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (error) {
        // The most common cause by far is an expired or missing session.
        setStatus("error");
        setMessage(
          error.message.toLowerCase().includes("row-level security") ||
            error.message.toLowerCase().includes("unauthorized")
            ? labels.signInRequired
            : `${labels.failed} ${error.message}`,
        );
        return;
      }

      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setUrl(data.publicUrl);
      setStatus("idle");
      setMessage(labels.done);
    } catch {
      setStatus("error");
      setMessage(labels.failed);
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium">{label}</span>

      <div className="mt-2 flex items-start gap-4">
        {url ? (
          <img
            src={url}
            alt=""
            className={`h-20 w-20 shrink-0 border border-border object-cover ${
              rounded ? "rounded-full" : "rounded-md"
            }`}
          />
        ) : (
          <span
            aria-hidden
            className={`flex h-20 w-20 shrink-0 items-center justify-center border border-dashed border-border text-xs text-muted ${
              rounded ? "rounded-full" : "rounded-md"
            }`}
          >
            {labels.noImage}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={status === "working"}
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand disabled:opacity-60"
            >
              {status === "working" ? labels.uploading : labels.choose}
            </button>

            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setMessage(null);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                {labels.remove}
              </button>
            )}
          </div>

          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          {message && (
            <p
              className={`mt-1 text-xs ${status === "error" ? "text-danger" : "text-brand"}`}
              role={status === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      {/* The form only ever submits the address; the file itself never touches it. */}
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
