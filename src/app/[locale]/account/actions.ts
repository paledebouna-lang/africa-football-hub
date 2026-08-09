"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MISSING_CONFIG_MESSAGE } from "@/lib/supabase/config";
import { getAccount } from "@/lib/account";

export type AuthState = { error?: string; notice?: string } | undefined;

const credentials = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export async function signUp(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: MISSING_CONFIG_MESSAGE };

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: String(formData.get("fullName") ?? "").trim() },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/fr/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase may or may not require email confirmation depending on the project
  // settings, so we tell the user to check their inbox rather than guessing.
  return {
    notice:
      "Compte créé. Vérifie ta boîte mail : un lien de confirmation a pu t'être envoyé.",
  };
}

export async function signIn(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: MISSING_CONFIG_MESSAGE };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Adresse e-mail ou mot de passe incorrect." };
  }

  redirect("/fr/account");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/fr/account/sign-in");
}

const organisationSchema = z.object({
  name: z.string().trim().min(2, "Le nom de l'organisation est obligatoire."),
  type: z.string().trim().min(1, "Choisis le type d'organisation."),
  email: z.string().trim().email("Adresse e-mail de contact invalide."),
});

/**
 * Registers a club or agency. The record starts PENDING: nothing it submits is
 * trusted until an administrator has verified the claim.
 */
export async function registerOrganisation(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const account = await getAccount();
  if (!account) redirect("/fr/account/sign-in");

  const parsed = organisationSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const clubId = String(formData.get("clubId") ?? "").trim() || null;
  if (parsed.data.type !== "AGENCY" && !clubId) {
    return {
      error:
        "Choisis le club ou le centre de formation que tu représentes. S'il n'est pas dans la liste, contacte-nous.",
    };
  }

  // One pending or approved claim per club: two accounts cannot both speak for
  // the same club.
  if (clubId) {
    const existing = await prisma.organisation.findFirst({
      where: { clubId, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (existing) {
      return {
        error:
          "Une demande existe déjà pour ce club. Contacte-nous si tu penses qu'il s'agit d'une erreur.",
      };
    }
  }

  let slug = slugify(parsed.data.name);
  let counter = 2;
  while (await prisma.organisation.findUnique({ where: { slug } })) {
    slug = `${slugify(parsed.data.name)}-${counter}`;
    counter += 1;
  }

  const organisation = await prisma.organisation.create({
    data: {
      slug,
      name: parsed.data.name,
      type: parsed.data.type as never,
      email: parsed.data.email,
      clubId,
      country: String(formData.get("country") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
      registration: String(formData.get("registration") ?? "").trim() || null,
      claimNote: String(formData.get("claimNote") ?? "").trim() || null,
      createdById: account.userId,
      members: {
        create: { userId: account.userId, role: "OWNER" },
      },
    },
  });

  revalidatePath("/fr/account");
  revalidatePath("/admin/organisations");
  redirect(`/fr/account?created=${organisation.slug}`);
}
