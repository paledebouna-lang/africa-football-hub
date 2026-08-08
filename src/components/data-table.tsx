// Written out in full: Tailwind only generates classes it can see as literals,
// so an interpolated `text-${align}` would silently produce no styling at all.
const ALIGNMENT = {
  start: "text-start",
  end: "text-end",
  center: "text-center",
} as const;

export type ColumnAlign = keyof typeof ALIGNMENT;

/** Dense, scannable table shell shared by squads, transfers and career records. */
export function DataTable({
  headers,
  children,
}: {
  headers: { label: string; align?: ColumnAlign }[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand/5 text-xs uppercase tracking-wide text-muted">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header.label}-${index}`}
                className={`px-3 py-2.5 font-semibold ${ALIGNMENT[header.align ?? "start"]}`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-s-4 border-accent ps-3 text-lg font-bold tracking-tight">
      {children}
    </h2>
  );
}
