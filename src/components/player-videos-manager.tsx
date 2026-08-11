import { prisma } from "@/lib/prisma";
import { AdminForm, type Field } from "@/components/admin-form";
import { DeleteButton } from "@/components/delete-button";
import { savePlayerVideo, deletePlayerVideo } from "@/app/admin/actions";

const VIDEO_TYPES = [
  { value: "HIGHLIGHTS", label: "Résumé" },
  { value: "MATCH", label: "Match complet" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "SKILLS", label: "Gestes techniques" },
];

const TYPE_LABELS = Object.fromEntries(VIDEO_TYPES.map((type) => [type.value, type.label]));

/**
 * Videos are edited from the player's own profile, like honours — the
 * player is implied by the page, so it cannot be picked wrongly.
 */
export async function PlayerVideosManager({ playerId }: { playerId: string }) {
  const videos = await prisma.playerVideo.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
  });

  const fields: Field[] = [
    {
      kind: "url",
      name: "url",
      label: "Lien YouTube",
      required: true,
      hint: "Colle l'adresse depuis la barre du navigateur, ex. https://www.youtube.com/watch?v=...",
    },
    {
      kind: "text",
      name: "title",
      label: "Titre (facultatif)",
      hint: "Ex. « Tous ses buts en Ligue 1 ivoirienne ».",
    },
    {
      kind: "select",
      name: "type",
      label: "Type",
      placeholder: "Choisir",
      options: VIDEO_TYPES,
      defaultValue: "HIGHLIGHTS",
    },
    { kind: "hidden", name: "playerId", label: "", defaultValue: playerId },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-4 font-semibold">Vidéos</h2>

      {videos.length === 0 ? (
        <p className="mb-6 text-sm text-muted">Aucune vidéo enregistrée.</p>
      ) : (
        <ul className="mb-6 divide-y divide-border rounded-lg border border-border">
          {videos.map((video) => (
            <li key={video.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium">
                  {video.title ?? TYPE_LABELS[video.type] ?? video.type}
                </span>
                {video.title && (
                  <span className="block text-xs text-muted">
                    {TYPE_LABELS[video.type] ?? video.type}
                  </span>
                )}
                <span className="block truncate text-xs text-muted">{video.url}</span>
              </span>
              <DeleteButton
                action={deletePlayerVideo}
                id={video.id}
                confirmLabel="Supprimer cette vidéo ?"
              />
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Ajouter une vidéo
      </h3>
      <AdminForm
        action={savePlayerVideo}
        cancelHref="/admin"
        submitLabel="Ajouter la vidéo"
        fields={fields}
      />
    </section>
  );
}
