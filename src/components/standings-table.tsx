import { Link } from "@/i18n/navigation";
import { Crest } from "@/components/ui/media";
import type { StandingRow } from "@/lib/standings";

export type StandingsTableEntry = StandingRow & {
  slug: string;
  name: string;
  logoUrl: string | null;
};

export type StandingsTableLabels = {
  team: string;
  played: string;
  won: string;
  drawn: string;
  lost: string;
  goalsFor: string;
  goalsAgainst: string;
  goalDifference: string;
  points: string;
};

/**
 * Renders one group's table. The caller resolves locale-aware names, hrefs
 * and labels ahead of time so this stays agnostic to clubs vs. national
 * teams, and to locale — matching the pattern used by HonoursList.
 */
export function StandingsTable({
  group,
  rows,
  hrefPrefix,
  labels,
}: {
  group: string | null;
  rows: StandingsTableEntry[];
  hrefPrefix: "/clubs" | "/national-teams";
  labels: StandingsTableLabels;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      {group && (
        <div className="border-b border-border bg-brand/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {group}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 text-start font-semibold">#</th>
            <th className="px-3 py-2.5 text-start font-semibold">{labels.team}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.played}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.won}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.drawn}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.lost}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.goalsFor}</th>
            <th className="px-3 py-2.5 text-end font-semibold">
              {labels.goalsAgainst}
            </th>
            <th className="px-3 py-2.5 text-end font-semibold">
              {labels.goalDifference}
            </th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.points}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={row.competitorId} className="hover:bg-brand/5">
              <td className="px-3 py-2 tabular-nums text-muted">{index + 1}</td>
              <td className="px-3 py-2">
                <Link
                  href={`${hrefPrefix}/${row.slug}`}
                  className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                >
                  <Crest src={row.logoUrl} name={row.name} size="sm" />
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-end tabular-nums">{row.played}</td>
              <td className="px-3 py-2 text-end tabular-nums">{row.won}</td>
              <td className="px-3 py-2 text-end tabular-nums">{row.drawn}</td>
              <td className="px-3 py-2 text-end tabular-nums">{row.lost}</td>
              <td className="px-3 py-2 text-end tabular-nums">{row.goalsFor}</td>
              <td className="px-3 py-2 text-end tabular-nums">{row.goalsAgainst}</td>
              <td className="px-3 py-2 text-end tabular-nums">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="px-3 py-2 text-end font-bold tabular-nums text-brand">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
