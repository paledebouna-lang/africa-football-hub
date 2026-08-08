import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { reviewOrganisation } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  ACADEMY: "Centre de formation",
  AGENCY: "Agence",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Validée",
  REJECTED: "Refusée",
  SUSPENDED: "Suspendue",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function AdminOrganisationsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const organisations = await prisma.organisation.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      club: true,
      createdBy: true,
      _count: { select: { members: true, createdPlayers: true } },
    },
  });

  const pending = organisations.filter((org) => org.status === "PENDING");
  const reviewed = organisations.filter((org) => org.status !== "PENDING");

  return (
    <AdminShell title="Comptes clubs et agences">
      <p className="mb-6 text-sm text-muted">
        Une organisation ne peut rien publier tant qu&apos;elle n&apos;est pas
        validée. Vérifie l&apos;identité du demandeur avant d&apos;approuver.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">
          En attente de validation
          <span className="ms-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
            {pending.length}
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted">Aucune demande en attente.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((org) => (
              <li
                key={org.id}
                className="rounded-lg border border-accent/30 bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{org.name}</p>
                    <p className="text-sm text-muted">
                      {TYPE_LABELS[org.type] ?? org.type}
                      {org.club && ` · représente ${org.club.nameFr}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    Demande du {dateFormat.format(org.createdAt)}
                  </p>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Row label="Demandeur">{org.createdBy.email}</Row>
                  <Row label="Contact">{org.email}</Row>
                  {org.phone && <Row label="Téléphone">{org.phone}</Row>}
                  {org.country && <Row label="Pays">{org.country}</Row>}
                  {org.city && <Row label="Ville">{org.city}</Row>}
                  {org.registration && (
                    <Row label="Licence / affiliation">{org.registration}</Row>
                  )}
                  {org.websiteUrl && (
                    <Row label="Site">
                      <a
                        href={org.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        {org.websiteUrl}
                      </a>
                    </Row>
                  )}
                </dl>

                {org.claimNote && (
                  <p className="mt-4 rounded-md bg-background p-3 text-sm">
                    {org.claimNote}
                  </p>
                )}

                <form
                  action={reviewOrganisation}
                  className="mt-4 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="id" value={org.id} />
                  <label className="flex-1 text-sm">
                    <span className="mb-1 block text-muted">
                      Motif (obligatoire en cas de refus)
                    </span>
                    <input
                      name="reviewNote"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    name="decision"
                    value="APPROVED"
                    className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
                  >
                    Valider
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="REJECTED"
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    Refuser
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Comptes traités</h2>

        {reviewed.length === 0 ? (
          <p className="text-sm text-muted">Aucun compte traité pour le moment.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Organisation</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Membres</th>
                  <th className="px-4 py-3 text-right font-medium">Joueurs</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviewed.map((org) => (
                  <tr key={org.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{org.name}</span>
                      {org.club && (
                        <span className="block text-xs text-muted">
                          {org.club.nameFr}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {TYPE_LABELS[org.type] ?? org.type}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {STATUS_LABELS[org.status] ?? org.status}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {org._count.members}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {org._count.createdPlayers}
                    </td>
                    <td className="px-4 py-3">
                      <form action={reviewOrganisation} className="flex justify-end">
                        <input type="hidden" name="id" value={org.id} />
                        <button
                          type="submit"
                          name="decision"
                          value={org.status === "APPROVED" ? "SUSPENDED" : "APPROVED"}
                          className="text-brand hover:underline"
                        >
                          {org.status === "APPROVED" ? "Suspendre" : "Valider"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
