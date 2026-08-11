import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveNews } from "../../actions";
import { newsFields } from "../news-fields";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const item = await prisma.newsItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <AdminShell title="Modifier l'actualité">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveNews}
          id={item.id}
          cancelHref="/admin/news"
          submitLabel="Enregistrer"
          fields={newsFields(item)}
        />
      </div>
    </AdminShell>
  );
}
