import Link from "next/link";
import { logout } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/competitions", label: "Compétitions" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/players", label: "Joueurs" },
  { href: "/admin/coaches", label: "Entraîneurs" },
  { href: "/admin/transfers", label: "Transferts" },
  { href: "/admin/countries", label: "Sélections" },
  { href: "/admin/organisations", label: "Comptes" },
  { href: "/admin/proposals", label: "Propositions" },
] as const;

export function AdminShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-semibold">Administration</span>
          <nav className="flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-4 text-sm">
            <Link href="/fr" className="text-muted hover:text-foreground">
              Voir le site
            </Link>
            <form action={logout}>
              <button type="submit" className="text-muted hover:text-foreground">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {action}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </>
  );
}
