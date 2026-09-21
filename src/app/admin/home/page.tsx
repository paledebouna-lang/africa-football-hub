import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm, type Field } from "@/components/admin-form";
import { saveHomeHero } from "../actions";

export default async function AdminHomePage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const hero = await prisma.homeHero.findUnique({ where: { id: "main" } });

  const fields: Field[] = [
    {
      kind: "url",
      name: "videoUrl",
      label: "Lien YouTube de la vidéo d'en-tête",
      defaultValue: hero?.videoUrl ?? "",
      hint: "Colle l'adresse depuis la barre du navigateur. La vidéo se lit en boucle, sans le son, derrière le titre de l'accueil. Choisis une vidéo dont l'auteur autorise l'intégration ; laisse vide pour garder le fond bleu.",
    },
    {
      kind: "checkbox",
      name: "isActive",
      label: "Afficher la vidéo sur la page d'accueil",
      defaultChecked: hero?.isActive ?? true,
    },
  ];

  return (
    <AdminShell title="Page d'accueil">
      <p className="mb-4 text-sm text-muted">
        Les autres blocs de l&apos;accueil (joueur de la semaine, meilleurs buteurs,
        meilleur joueur par pays, les 9 championnats les plus forts) se mettent à
        jour seuls à partir des feuilles de match et des valeurs marchandes.
      </p>
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveHomeHero}
          cancelHref="/admin"
          submitLabel="Enregistrer"
          fields={fields}
        />
      </div>
    </AdminShell>
  );
}
