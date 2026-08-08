import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAccount, getMemberships } from "@/lib/account";
import { SectionTitle } from "@/components/data-table";
import { Badge } from "@/components/profile-header";
import { signOut } from "./actions";

const STATUS_TONE = {
  PENDING: "accent",
  APPROVED: "brand",
  REJECTED: "neutral",
  SUSPENDED: "neutral",
} as const;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const account = await getAccount();
  if (!account) redirect("/fr/account/sign-in");

  const memberships = await getMemberships(account.userId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-muted">{account.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            {t("nav.signOut")}
          </button>
        </form>
      </div>

      {account.isBanned && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {t("account.banned")}
        </p>
      )}

      <section>
        <SectionTitle>{t("account.organisations")}</SectionTitle>

        {memberships.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="font-medium">{t("account.noOrganisation")}</p>
            <p className="mt-1 text-sm text-muted">{t("account.noOrganisationHint")}</p>
            <Link
              href="/account/organisations/new"
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              {t("account.registerOrganisation")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {memberships.map((membership) => {
                const organisation = membership.organisation;
                return (
                  <li key={membership.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{organisation.name}</p>
                        <p className="text-sm text-muted">
                          {t(`organisationType.${organisation.type}`)}
                          {organisation.club && ` · ${organisation.club.nameFr}`}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[organisation.status]}>
                        {t(`organisationStatus.${organisation.status}`)}
                      </Badge>
                    </div>

                    {organisation.status === "PENDING" && (
                      <p className="mt-3 rounded-md bg-accent/10 p-3 text-sm text-muted">
                        {t("account.pendingExplain")}
                      </p>
                    )}
                    {organisation.status === "REJECTED" && organisation.reviewNote && (
                      <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted">
                        {organisation.reviewNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <Link
              href="/account/organisations/new"
              className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
            >
              {t("account.registerAnother")}
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
