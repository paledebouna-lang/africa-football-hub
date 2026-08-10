import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveCountry } from "../../actions";
import { countryFields } from "../country-fields";

export default async function NewCountryPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <AdminShell title="Ajouter un pays">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveCountry}
          cancelHref="/admin/countries"
          submitLabel="Créer le pays"
          fields={countryFields()}
        />
      </div>
    </AdminShell>
  );
}
