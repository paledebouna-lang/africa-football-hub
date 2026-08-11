import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getAllNews } from "@/lib/queries";
import { NewsCard } from "@/components/news-card";

export default async function AllNewsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const news = await getAllNews();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("home.news")}</h1>

      {news.length === 0 ? (
        <p className="text-sm text-muted">{t("home.emptyState")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {news.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              locale={locale}
              readMoreLabel={t("home.readMore")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
