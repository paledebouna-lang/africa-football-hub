import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Account = {
  userId: string;
  email: string;
  username: string;
  isBanned: boolean;
};

/**
 * Returns the signed-in account, creating its profile row on first visit.
 *
 * Supabase owns authentication; this table owns everything the platform needs to
 * know about a user beyond "they proved they own this email".
 */
export async function getAccount(): Promise<Account | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const profile = await prisma.userProfile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email,
      // Usernames must be unique; the local part of the email is a reasonable
      // first guess, with the id appended if it is already taken.
      username: await availableUsername(user.email.split("@")[0], user.id),
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
  });

  return {
    userId: profile.id,
    email: profile.email,
    username: profile.username,
    isBanned: profile.isBanned,
  };
}

async function availableUsername(seed: string, userId: string): Promise<string> {
  const base = seed.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "membre";
  const taken = await prisma.userProfile.findUnique({ where: { username: base } });
  return taken ? `${base}-${userId.slice(0, 6)}` : base;
}

/** The organisations this user belongs to, with the club each one speaks for. */
export async function getMemberships(userId: string) {
  return prisma.organisationMember.findMany({
    where: { userId, isActive: true },
    include: { organisation: { include: { club: true } } },
    orderBy: { createdAt: "asc" },
  });
}
