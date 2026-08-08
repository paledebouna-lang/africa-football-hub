import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` only needs the schema, never the credentials — so the URL is
 * read leniently here. Using prisma's `env()` helper would abort config loading
 * whenever DIRECT_URL is absent, breaking builds that merely generate the client.
 * Commands that do reach the database (migrate, seed) still get the real URL.
 */
const datasourceUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
