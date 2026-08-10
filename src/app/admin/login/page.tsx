import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

/**
 * The administration screen has no login form of its own anymore — it's
 * merged into the member sign-in page, with a toggle for the admin
 * credentials, so there is a single visible entry point for everyone.
 * Every admin page still redirects here when unauthenticated; this just
 * forwards on to the real form.
 */
export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }
  redirect("/fr/account/sign-in?admin=1");
}
