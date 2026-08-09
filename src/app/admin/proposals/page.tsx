import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { reviewProposal } from "../actions";

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

export default async function AdminProposalsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const proposals = await prisma.valueProposal.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: true,
      player: {
        include: {
          club: true,
          marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const pending = proposals.filter((proposal) => proposal.status === "PENDING");
  const reviewed = proposals.filter((proposal) => proposal.status !== "PENDING");

  return (
    <AdminShell title="Propositions de valeur">
      <p className="mb-6 text-sm text-muted">
        Une proposition ne compte dans la valeur d&apos;un joueur qu&apos;une fois
        acceptée. Il faut au moins trois propositions acceptées pour que la
        communauté pèse sur le calcul.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">
          En attente
          <span className="ms-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
            {pending.length}
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted">Aucune proposition en attente.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((proposal) => {
              const current = proposal.player.marketValues[0]?.valueUsd ?? null;

              return (
                <li
                  key={proposal.id}
                  className="rounded-lg border border-accent/30 bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/admin/players/${proposal.playerId}`}
                        className="font-semibold hover:text-brand"
                      >
                        {proposal.player.name}
                      </Link>
                      <p className="text-sm text-muted">
                        {proposal.player.club?.nameFr ?? "Sans club"}
                        {" · "}
                        {proposal.user.email}
                        {" · "}
                        {dateFormat.format(proposal.createdAt)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-lg font-bold text-brand">
                        {money.format(proposal.valueUsd)}
                      </p>
                      {current !== null && (
                        <p className="text-xs text-muted">
                          valeur actuelle {money.format(current)}
                        </p>
                      )}
                    </div>
                  </div>

                  {proposal.comment && (
                    <p className="mt-3 rounded-md bg-background p-3 text-sm">
                      {proposal.comment}
                    </p>
                  )}

                  <form action={reviewProposal} className="mt-3 flex justify-end gap-3">
                    <input type="hidden" name="id" value={proposal.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="ACCEPTED"
                      className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
                    >
                      Accepter
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
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Propositions traitées</h2>

        {reviewed.length === 0 ? (
          <p className="text-sm text-muted">Aucune proposition traitée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Joueur</th>
                  <th className="px-4 py-3 text-left font-medium">Membre</th>
                  <th className="px-4 py-3 text-right font-medium">Proposition</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviewed.map((proposal) => (
                  <tr key={proposal.id}>
                    <td className="px-4 py-3 font-medium">{proposal.player.name}</td>
                    <td className="px-4 py-3 text-muted">{proposal.user.email}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money.format(proposal.valueUsd)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {STATUS_LABELS[proposal.status] ?? proposal.status}
                    </td>
                    <td className="px-4 py-3">
                      <form action={reviewProposal} className="flex justify-end">
                        <input type="hidden" name="id" value={proposal.id} />
                        <button
                          type="submit"
                          name="decision"
                          value={
                            proposal.status === "ACCEPTED" ? "REJECTED" : "ACCEPTED"
                          }
                          className="text-brand hover:underline"
                        >
                          {proposal.status === "ACCEPTED" ? "Retirer" : "Accepter"}
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
