/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { getNewsItem } from "@/lib/queries";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const item = await getNewsItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link href="/" className="text-sm text-brand hover:underline">
        {t("news.back")}
      </Link>

      <article className="overflow-hidden rounded-lg border border-border bg-surface">
        {item.imageUrl && (
          <img src={item.imageUrl} alt="" className="aspect-video w-full object-cover" />
        )}
        <div className="p-6">
          <span className="text-sm text-muted">
            {formatDate(item.publishedAt, locale)}
            {item.sourceName && ` · ${t("news.sourcePrefix")} ${item.sourceName}`}
          </span>
          <h1 className="mt-1 text-2xl font-bold">{item.title}</h1>
          <p className="mt-4 whitespace-pre-line text-foreground">{item.excerpt}</p>

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
            >
              {t("news.source")}
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
