import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteNews, refreshNewsNow } from "../actions";

export default async function AdminNewsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const news = await prisma.newsItem.findMany({ orderBy: { publishedAt: "desc" } });
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

  return (
    <AdminShell
      title="Actualités"
      action={
        <div className="flex items-center gap-3">
          <form action={refreshNewsNow}>
            <button
              type="submit"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-brand transition-colors"
            >
              Actualiser maintenant
            </button>
          </form>
          <Link
            href="/admin/news/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Publier une actualité
          </Link>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Ces informations s&apos;affichent sous forme de petites cartes sur la page
        d&apos;accueil, dans leur ordre de publication. « Actualiser maintenant »
        relaie les dernières dépêches de RFI Sport, BBC Afrique, Jeune Afrique et
        Africa Top Sports qui citent un club, un joueur, un entraîneur, une
        sélection ou une compétition déjà enregistré sur le site — un passage
        automatique tourne aussi chaque jour.
      </p>

      {news.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Aucune actualité publiée.</p>
          <Link
            href="/admin/news/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Publier une actualité
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Titre</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {news.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {dateFormat.format(item.publishedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-muted">
                    <span className="inline-flex items-center gap-2">
                      {item.origin === "AUTO" && (
                        <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand">
                          Auto
                        </span>
                      )}
                      {item.sourceName ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/news/${item.id}`}
                        className="text-brand hover:underline"
                      >
                        Modifier
                      </Link>
                      <DeleteButton
                        action={deleteNews}
                        id={item.id}
                        confirmLabel={`Supprimer l'actualité « ${item.title} » ?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
