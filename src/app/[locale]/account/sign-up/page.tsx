import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAccount } from "@/lib/account";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";

export default async function SignUpPage({
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
        <h1 className="text-xl font-bold">{t("account.signUpTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("account.signUpIntro")}</p>

        <div className="mt-6">
          <AuthForm
            action={signUp}
            submitLabel={t("nav.signUp")}
            withName
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
          {t("account.haveAccount")}{" "}
          <Link href="/account/sign-in" className="font-medium text-brand hover:underline">
            {t("nav.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
