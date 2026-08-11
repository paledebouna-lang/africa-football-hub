/* eslint-disable @next/next/no-img-element */
/**
 * Advertising zones. Show the admin's own banner (see /admin/ads) when one
 * is active; otherwise fall back to an empty placeholder — there is no ad
 * network wired in yet.
 */
type AdBanner = { imageUrl: string | null; linkUrl: string | null } | null;

function BannerImage({ banner, className }: { banner: AdBanner; className: string }) {
  if (!banner?.imageUrl) return null;

  const image = <img src={banner.imageUrl} alt="" className={className} />;

  if (!banner.linkUrl) return image;

  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer sponsored">
      {image}
    </a>
  );
}

export function AdRail({
  banner = null,
  className = "",
}: {
  banner?: AdBanner;
  className?: string;
}) {
  if (banner?.imageUrl) {
    return (
      <div className={`sticky top-20 hidden h-[600px] w-40 shrink-0 xl:block ${className}`}>
        <BannerImage banner={banner} className="h-full w-full rounded-md object-cover" />
      </div>
    );
  }

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

export function AdSlotInline({
  banner = null,
  className = "",
}: {
  banner?: AdBanner;
  className?: string;
}) {
  if (banner?.imageUrl) {
    return (
      <div className={`h-24 w-full overflow-hidden rounded-md ${className}`}>
        <BannerImage banner={banner} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border bg-surface text-xs text-muted ${className}`}
    >
      Emplacement publicitaire
    </div>
  );
}
