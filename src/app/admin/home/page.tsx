import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { HeroVideoForm } from "@/components/hero-video-form";
import { saveHomeHero } from "../actions";

export default async function AdminHomePage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const hero = await prisma.homeHero.findUnique({ where: { id: "main" } });

  return (
    <AdminShell title="Page d'accueil">
      <p className="mb-4 text-sm text-muted">
        Les autres blocs de l&apos;accueil (joueur de la semaine, meilleurs buteurs,
        meilleur joueur par pays, les 9 championnats les plus forts) se mettent à
        jour seuls à partir des feuilles de match et des valeurs marchandes.
      </p>
      <div className="rounded-lg border border-border bg-surface p-6">
        <HeroVideoForm
          action={saveHomeHero}
          defaultUrl={hero?.videoUrl ?? ""}
          defaultActive={hero?.isActive ?? true}
        />
      </div>
    </AdminShell>
  );
}
