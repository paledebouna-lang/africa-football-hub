import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveAdBanner } from "../actions";
import { adBannerFields } from "./ad-fields";

export default async function AdminAdsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const banners = await prisma.adBanner.findMany();
  const rail = banners.find((b) => b.placement === "RAIL");
  const inline = banners.find((b) => b.placement === "INLINE");

  return (
    <AdminShell title="Publicité">
      <p className="mb-4 text-sm text-muted">
        Ces encarts s&apos;affichent sur tout le site tant qu&apos;aucun réseau
        publicitaire n&apos;est branché. Dépose une image et un lien pour y faire
        apparaître tes propres publicités ; décoche « Afficher » pour repasser à
        l&apos;emplacement vide.
      </p>

      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-1 font-semibold">Encart latéral</h2>
          <p className="mb-4 text-sm text-muted">
            Affiché sur les côtés de toutes les pages (grands écrans uniquement).
          </p>
          <AdminForm
            action={saveAdBanner}
            cancelHref="/admin"
            submitLabel="Enregistrer"
            fields={adBannerFields({
              placement: "RAIL",
              imageUrl: rail?.imageUrl,
              linkUrl: rail?.linkUrl,
              isActive: rail?.isActive ?? true,
            })}
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-1 font-semibold">Bandeau</h2>
          <p className="mb-4 text-sm text-muted">
            Affiché en bandeau horizontal sur la page d&apos;accueil.
          </p>
          <AdminForm
            action={saveAdBanner}
            cancelHref="/admin"
            submitLabel="Enregistrer"
            fields={adBannerFields({
              placement: "INLINE",
              imageUrl: inline?.imageUrl,
              linkUrl: inline?.linkUrl,
              isActive: inline?.isActive ?? true,
            })}
          />
        </section>
      </div>
    </AdminShell>
  );
}
