/* eslint-disable @next/next/no-img-element */
import type { NewsItem } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";

export function NewsCard({
  item,
  locale,
  readMoreLabel,
}: {
  item: NewsItem;
  locale: Locale;
  readMoreLabel: string;
}) {
  const card = (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-brand/10 transition-colors hover:border-brand">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
        <span className="text-[11px] text-white/70">
          {formatDate(item.publishedAt, locale)}
        </span>
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {item.title}
        </span>
        <span className="line-clamp-2 text-xs text-white/80">{item.excerpt}</span>
      </div>
    </div>
  );

  if (!item.sourceUrl) return card;

  return (
    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title={readMoreLabel}>
      {card}
    </a>
  );
}
