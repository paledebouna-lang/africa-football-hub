import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAccount } from "@/lib/account";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "../actions";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  if (await getAccount()) redirect("/fr/account");

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h1 className="text-xl font-bold">{t("account.signInTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("account.signInIntro")}</p>

        <div className="mt-6">
          <AuthForm
            action={signIn}
            submitLabel={t("nav.signIn")}
            labels={{
              fullName: t("account.fullName"),
              email: t("account.email"),
              password: t("account.password"),
              passwordHint: t("account.passwordHint"),
              pending: t("common.loading"),
            }}
          />
        </div>

        <p className="mt-6 text-sm text-muted">
          {t("account.noAccount")}{" "}
          <Link href="/account/sign-up" className="font-medium text-brand hover:underline">
            {t("nav.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
