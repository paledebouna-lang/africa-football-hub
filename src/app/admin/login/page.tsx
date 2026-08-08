import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="mt-1 text-sm text-muted">
          Saisis le mot de passe d&apos;administration pour continuer.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
