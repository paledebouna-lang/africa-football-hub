import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAccount } from "@/lib/account";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AuthForm } from "@/components/auth-form";
import { AdminLoginForm } from "@/components/admin-login-form";
import { signIn } from "../actions";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ admin?: string }>;
}) {
  const { locale } = await params;
  const { admin } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  if (admin) {
    if (await isAdminAuthenticated()) redirect("/admin");
  } else if (await getAccount()) {
    redirect("/fr/account");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-border bg-surface p-6">
        {admin ? (
          <>
            <h1 className="text-xl font-bold">{t("account.adminSignInTitle")}</h1>
            <p className="mt-1 text-sm text-muted">{t("account.adminSignInIntro")}</p>
            <div className="mt-6">
              <AdminLoginForm />
            </div>
          </>
        ) : (
          <>
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
              <Link
                href="/account/sign-up"
                className="font-medium text-brand hover:underline"
              >
                {t("nav.signUp")}
              </Link>
            </p>
          </>
        )}

        <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
          {admin ? (
            <Link href="/account/sign-in" className="hover:text-foreground hover:underline">
              {t("account.backToMemberSignIn")}
            </Link>
          ) : (
            <Link
              href={{ pathname: "/account/sign-in", query: { admin: "1" } }}
              className="hover:text-foreground hover:underline"
            >
              {t("account.adminSignInToggle")}
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
