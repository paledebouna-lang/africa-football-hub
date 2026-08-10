import { Link } from "@/i18n/navigation";
import { PlayerPhoto } from "@/components/ui/media";
import type { TopScorerRow } from "@/lib/fixtures";

export type TopScorersLabels = {
  player: string;
  club: string;
  goals: string;
  assists: string;
};

export function TopScorersTable({
  rows,
  labels,
}: {
  rows: TopScorerRow[];
  labels: TopScorersLabels;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand/5 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 text-start font-semibold">#</th>
            <th className="px-3 py-2.5 text-start font-semibold">{labels.player}</th>
            <th className="px-3 py-2.5 text-start font-semibold">{labels.club}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.goals}</th>
            <th className="px-3 py-2.5 text-end font-semibold">{labels.assists}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={row.playerId} className="hover:bg-brand/5">
              <td className="px-3 py-2 tabular-nums text-muted">{index + 1}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/players/${row.playerSlug}`}
                  className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                >
                  <PlayerPhoto src={row.photoUrl} name={row.playerName} size="sm" />
                  {row.playerName}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted">{row.clubOrCountryName ?? "—"}</td>
              <td className="px-3 py-2 text-end font-bold tabular-nums text-brand">
                {row.goals}
              </td>
              <td className="px-3 py-2 text-end tabular-nums">{row.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
