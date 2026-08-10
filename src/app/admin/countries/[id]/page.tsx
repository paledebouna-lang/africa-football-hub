import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { HonoursManager } from "@/components/honours-manager";
import { NationalSquadsManager } from "@/components/national-squads-manager";
import { saveCountry } from "../../actions";
import { countryFields } from "../country-fields";

export default async function EditCountryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const country = await prisma.country.findUnique({ where: { id } });
  if (!country) notFound();

  return (
    <AdminShell
      title={`Sélection nationale — ${country.nameFr}`}
      action={
        <Link
          href={`/admin/countries/${country.id}/matches`}
          className="text-sm text-brand hover:underline"
        >
          Matchs de la sélection
        </Link>
      }
    >
      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">Fiche du pays</h2>
          <AdminForm
            action={saveCountry}
            id={country.id}
            cancelHref="/admin/countries"
            submitLabel="Enregistrer"
            fields={countryFields(country)}
          />
        </section>

        <NationalSquadsManager countryId={country.id} countryName={country.nameFr} />

        <HonoursManager holder={{ kind: "countryId", id: country.id }} />
      </div>
    </AdminShell>
  );
}
