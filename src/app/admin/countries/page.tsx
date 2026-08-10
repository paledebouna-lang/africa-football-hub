import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { Flag } from "@/components/ui/media";

export default async function AdminCountriesPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const countries = await prisma.country.findMany({
    orderBy: { nameFr: "asc" },
    include: {
      _count: { select: { competitions: true, honours: true } },
    },
  });

  return (
    <AdminShell
      title="Pays et sélections nationales"
      action={
        <Link
          href="/admin/countries/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
        >
          Ajouter un pays
        </Link>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Le palmarès d&apos;une sélection nationale se gère depuis la fiche de son
        pays.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Pays</th>
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-right font-medium">Compétitions</th>
              <th className="px-4 py-3 text-right font-medium">Titres</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {countries.map((country) => (
              <tr key={country.id}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Flag src={country.flagUrl} label={country.nameFr} />
                    {country.nameFr}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{country.code}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {country._count.competitions}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {country._count.honours}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Link
                      href={`/admin/countries/${country.id}`}
                      className="text-brand hover:underline"
                    >
                      Modifier
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
