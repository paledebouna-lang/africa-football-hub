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
    <header>
      {/* Brand bar: the deep blue anchors the identity, the red rule marks it. */}
      <div className="bg-brand-strong text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded bg-white text-sm font-black text-brand-strong"
            >
              AF
            </span>
            <span className="text-lg font-bold tracking-tight">{site.name}</span>
          </Link>

          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <SearchBox placeholder={t("searchPlaceholder")} label={t("search")} />
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/account"
              className="text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              {t("myAccount")}
            </Link>
            <LocaleSwitcher currentLocale={locale} />
          </div>
        </div>
      </div>

      <div className="h-1 bg-accent" />

      <nav className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b-2 border-transparent py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
