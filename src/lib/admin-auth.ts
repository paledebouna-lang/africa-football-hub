import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "afh_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD n'est pas défini dans le fichier .env — impossible d'ouvrir l'administration.",
    );
  }
  return password;
}

/** Session token derived from the password, so no session store is needed. */
function expectedToken(): string {
  return createHmac("sha256", adminPassword()).update("admin-session").digest("hex");
}

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function verifyPassword(candidate: string): boolean {
  return safeEquals(candidate, adminPassword());
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEquals(token, expectedToken());
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
