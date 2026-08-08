export function SiteFooter({
  notice,
  rights,
}: {
  notice: string;
  rights: string;
}) {
  return (
    <footer className="border-t border-border bg-surface mt-12">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted space-y-1">
        <p>{notice}</p>
        <p>{rights}</p>
      </div>
    </footer>
  );
}
