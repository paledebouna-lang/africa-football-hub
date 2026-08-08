/* eslint-disable @next/next/no-img-element */
/**
 * Small image primitives for crests, portraits and flags.
 *
 * These deliberately use plain <img> rather than next/image: the pages show
 * dozens of tiny thumbnails per table, and routing every one through Vercel's
 * image optimiser would burn the free-tier quota for no visual gain on images
 * that are already 20-60px wide. Every one falls back to a drawn placeholder,
 * so a missing or dead URL never leaves a broken-image icon in a table.
 */

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

export type MediaSize = keyof typeof SIZES;

export function Crest({
  src,
  name,
  size = "md",
}: {
  src: string | null | undefined;
  name: string;
  size?: MediaSize;
}) {
  const classes = `${SIZES[size]} shrink-0 rounded-md object-contain`;

  if (!src) {
    return (
      <span
        aria-hidden
        className={`${SIZES[size]} shrink-0 inline-flex items-center justify-center rounded-md bg-brand/10 font-bold text-brand`}
      >
        {initialsOf(name)}
      </span>
    );
  }

  return <img src={src} alt="" loading="lazy" className={classes} />;
}

export function PlayerPhoto({
  src,
  name,
  size = "md",
}: {
  src: string | null | undefined;
  name: string;
  size?: MediaSize;
}) {
  const classes = `${SIZES[size]} shrink-0 rounded-full object-cover bg-brand/10`;

  if (!src) {
    return (
      <span
        aria-hidden
        className={`${SIZES[size]} shrink-0 inline-flex items-center justify-center rounded-full bg-brand/10 font-semibold text-brand`}
      >
        {initialsOf(name)}
      </span>
    );
  }

  return <img src={src} alt="" loading="lazy" className={classes} />;
}

export function Flag({
  src,
  label,
}: {
  src: string | null | undefined;
  label: string;
}) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={label}
      title={label}
      loading="lazy"
      className="inline-block h-3.5 w-5 shrink-0 rounded-[2px] object-cover align-[-1px]"
    />
  );
}
