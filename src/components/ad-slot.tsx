/**
 * Placeholder advertising zones. Empty on purpose — there is no ad network
 * wired in yet. Once the site has real content and traffic and an ad network
 * account is approved, drop that network's script/unit code inside these
 * containers (or replace them outright) to go live.
 */
export function AdRail({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-hidden
      className={`sticky top-20 hidden h-[600px] w-40 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface text-center text-xs text-muted xl:flex ${className}`}
    >
      <span>
        Emplacement
        <br />
        publicitaire
        <br />
        <span className="text-[10px] opacity-70">160×600</span>
      </span>
    </aside>
  );
}

export function AdSlotInline({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border bg-surface text-xs text-muted ${className}`}
    >
      Emplacement publicitaire
    </div>
  );
}
