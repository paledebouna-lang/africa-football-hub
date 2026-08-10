import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, isRtl, type Locale } from "@/i18n/routing";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdRail } from "@/components/ad-slot";
import "../globals.css";

const inter = Inter({
  variable: "--font-sans-latin",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const activeLocale = hasLocale(routing.locales, locale)
    ? (locale as Locale)
    : routing.defaultLocale;

  return {
    title: {
      default: `${site.name} — ${site.tagline[activeLocale]}`,
      template: `%s — ${site.name}`,
    },
    description: site.tagline[activeLocale],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        <NextIntlClientProvider>
          <SiteHeader locale={locale as Locale} />
          <main className="flex-1 w-full">
            <div className="mx-auto flex max-w-[1760px] items-start justify-center gap-4 px-2">
              <AdRail />
              <div className="min-w-0 flex-1">{children}</div>
              <AdRail />
            </div>
          </main>
          <SiteFooter
            notice={t("footer.dataNotice")}
            rights={`© ${new Date().getFullYear()} ${site.name}. ${t("footer.rights")}`}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
