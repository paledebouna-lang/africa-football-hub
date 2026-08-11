import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveNews } from "../../actions";
import { newsFields } from "../news-fields";

export default async function NewNewsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <AdminShell title="Publier une actualité">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveNews}
          cancelHref="/admin/news"
          submitLabel="Publier"
          fields={newsFields()}
        />
      </div>
    </AdminShell>
  );
}
