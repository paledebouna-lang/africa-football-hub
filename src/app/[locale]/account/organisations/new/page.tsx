import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getAccount } from "@/lib/account";
import { OrganisationForm } from "@/components/organisation-form";
import { registerOrganisation } from "../../actions";

export default async function NewOrganisationPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  if (!(await getAccount())) redirect("/fr/account/sign-in");

  // Clubs already claimed by a live account are not offered again.
  const claimed = await prisma.organisation.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] }, clubId: { not: null } },
    select: { clubId: true },
  });
  const claimedIds = claimed.map((row) => row.clubId!).filter(Boolean);

  const clubs = await prisma.club.findMany({
    where: { id: { notIn: claimedIds } },
    orderBy: { nameFr: "asc" },
    include: { primaryCompetition: { include: { country: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t("account.registerOrganisation")}</h1>
      <p className="mt-2 text-sm text-muted">{t("account.registerIntro")}</p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <OrganisationForm
          action={registerOrganisation}
          submitLabel={t("account.submitClaim")}
          clubs={clubs.map((club) => ({
            value: club.id,
            label: club.primaryCompetition?.country
              ? `${club.nameFr} (${club.primaryCompetition.country.nameFr})`
              : club.nameFr,
          }))}
          labels={{
            type: t("account.orgType"),
            typeClub: t("organisationType.CLUB"),
            typeAcademy: t("organisationType.ACADEMY"),
            typeAgency: t("organisationType.AGENCY"),
            name: t("account.orgName"),
            club: t("account.orgClub"),
            clubHint: t("account.orgClubHint"),
            clubPlaceholder: t("account.orgClubPlaceholder"),
            email: t("account.orgEmail"),
            phone: t("account.orgPhone"),
            country: t("account.orgCountry"),
            city: t("account.orgCity"),
            website: t("account.orgWebsite"),
            registration: t("account.orgRegistration"),
            registrationHint: t("account.orgRegistrationHint"),
            claimNote: t("account.orgClaimNote"),
            claimNoteHint: t("account.orgClaimNoteHint"),
            pending: t("common.loading"),
          }}
        />
      </div>
    </div>
  );
}
