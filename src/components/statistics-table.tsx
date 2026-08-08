import type { Locale } from "@/i18n/routing";
import { localizedName } from "@/lib/localized";
import { DataTable } from "@/components/data-table";
import type { StatLine } from "@/lib/statistics";
import { totalOf } from "@/lib/statistics";

export function StatisticsTable({
  lines,
  locale,
  labels,
  showCleanSheets,
}: {
  lines: StatLine[];
  locale: Locale;
  labels: Record<string, string>;
  showCleanSheets: boolean;
}) {
  const total = totalOf(lines);

  const headers = [
    { label: labels.season },
    { label: labels.competition },
    { label: labels.appearances, align: "end" as const },
    { label: labels.minutes, align: "end" as const },
    { label: labels.goals, align: "end" as const },
    { label: labels.assists, align: "end" as const },
    ...(showCleanSheets
      ? [{ label: labels.cleanSheets, align: "end" as const }]
      : []),
    { label: "🟨", align: "end" as const },
    { label: "🟥", align: "end" as const },
  ];

  return (
    <DataTable headers={headers}>
      {lines.map((line) => (
        <tr key={`${line.competitionId}-${line.seasonLabel}`} className="hover:bg-brand/5">
          <td className="px-3 py-2 tabular-nums text-muted">{line.seasonLabel}</td>
          <td className="px-3 py-2 font-medium">
            {localizedName(
              {
                nameFr: line.competitionNameFr,
                nameEn: line.competitionNameEn,
                nameAr: line.competitionNameAr,
              },
              locale,
            )}
          </td>
          <td className="px-3 py-2 text-end tabular-nums">
            {line.appearances}
            <span className="text-xs text-muted"> ({line.starts})</span>
          </td>
          <td className="px-3 py-2 text-end tabular-nums">{line.minutesPlayed}</td>
          <td className="px-3 py-2 text-end font-semibold tabular-nums">
            {line.goals}
          </td>
          <td className="px-3 py-2 text-end tabular-nums">{line.assists}</td>
          {showCleanSheets && (
            <td className="px-3 py-2 text-end tabular-nums">{line.cleanSheets}</td>
          )}
          <td className="px-3 py-2 text-end tabular-nums text-muted">
            {line.yellowCards}
          </td>
          <td className="px-3 py-2 text-end tabular-nums text-muted">
            {line.redCards}
          </td>
        </tr>
      ))}

      <tr className="bg-brand/5 font-semibold">
        <td className="px-3 py-2" colSpan={2}>
          {labels.total}
        </td>
        <td className="px-3 py-2 text-end tabular-nums">
          {total.appearances}
          <span className="text-xs font-normal text-muted"> ({total.starts})</span>
        </td>
        <td className="px-3 py-2 text-end tabular-nums">{total.minutesPlayed}</td>
        <td className="px-3 py-2 text-end tabular-nums">{total.goals}</td>
        <td className="px-3 py-2 text-end tabular-nums">{total.assists}</td>
        {showCleanSheets && (
          <td className="px-3 py-2 text-end tabular-nums">{total.cleanSheets}</td>
        )}
        <td className="px-3 py-2 text-end tabular-nums">{total.yellowCards}</td>
        <td className="px-3 py-2 text-end tabular-nums">{total.redCards}</td>
      </tr>
    </DataTable>
  );
}
