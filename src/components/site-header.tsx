import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { site } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { SearchBox } from "./search-box";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");

  const links = [
    { href: "/competitions", label: t("competitions") },
    { href: "/transfers", label: t("transfers") },
  ] as const;

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white font-bold text-sm"
          >
            AF
          </span>
          <span className="font-semibold tracking-tight">{site.name}</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 min-w-[12rem]">
          <SearchBox placeholder={t("searchPlaceholder")} label={t("search")} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Admin lives outside the localized routes, so it needs a plain anchor. */}
          <a
            href="/admin"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {t("admin")}
          </a>
          <LocaleSwitcher currentLocale={locale} />
        </div>
      </div>
    </header>
  );
}
