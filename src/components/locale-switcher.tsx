"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/routing";

export function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      aria-label="Language"
      value={currentLocale}
      disabled={isPending}
      onChange={(event) => {
        const nextLocale = event.target.value as Locale;
        startTransition(() => {
          router.replace(pathname, { locale: nextLocale });
        });
      }}
      className="rounded border-0 bg-white/15 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-foreground"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeLabels[locale]}
        </option>
      ))}
    </select>
  );
}
