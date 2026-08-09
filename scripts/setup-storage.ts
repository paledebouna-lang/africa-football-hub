import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Creates the public `media` bucket used for crests, portraits and team photos.
 *
 * Supabase Storage keeps its buckets in ordinary Postgres tables, so this can be
 * done over the same connection Prisma already uses — sparing a trip through the
 * dashboard. Uploads themselves still go through the server, which checks who is
 * asking before writing anything.
 */
async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'media',
      'media',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = true,
          file_size_limit = 5242880,
          allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  `);

  // Anyone may read — the bucket holds crests and portraits meant to be public.
  // Only a signed-in member may write, so an anonymous visitor cannot fill the
  // storage quota. Which entity an uploaded file can be attached to is decided by
  // the server actions, not here.
  const policies: { name: string; sql: string }[] = [
    {
      name: "media_public_read",
      sql: `CREATE POLICY "media_public_read" ON storage.objects
              FOR SELECT USING (bucket_id = 'media');`,
    },
    {
      name: "media_authenticated_insert",
      sql: `CREATE POLICY "media_authenticated_insert" ON storage.objects
              FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');`,
    },
    {
      name: "media_authenticated_update",
      sql: `CREATE POLICY "media_authenticated_update" ON storage.objects
              FOR UPDATE TO authenticated USING (bucket_id = 'media');`,
    },
    {
      name: "media_authenticated_delete",
      sql: `CREATE POLICY "media_authenticated_delete" ON storage.objects
              FOR DELETE TO authenticated USING (bucket_id = 'media');`,
    },
  ];

  for (const policy of policies) {
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;`,
    );
    await prisma.$executeRawUnsafe(policy.sql);
  }

  const buckets = await prisma.$queryRawUnsafe<
    { id: string; public: boolean; file_size_limit: bigint | null }[]
  >(`SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'media';`);

  const created = await prisma.$queryRawUnsafe<{ policyname: string }[]>(
    `SELECT policyname FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname LIKE 'media_%' ORDER BY policyname;`,
  );

  console.log(
    "Bucket media :",
    JSON.stringify(buckets, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
  console.log("Règles d'accès :", created.map((row) => row.policyname).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Échec :", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
