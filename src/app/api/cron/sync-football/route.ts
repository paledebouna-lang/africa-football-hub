import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { apiFootballConfigured } from "@/lib/api-football";
import { runFootballSync } from "@/lib/football-sync";

// A full sweep of every linked league and a batch of squads takes a while.
export const maxDuration = 300;

/**
 * Fixtures and results (TheSportsDB) and squads (API-Football) sync, twice a
 * day. Vercel Cron hits this on a schedule (see vercel.json); the
 * "Synchroniser maintenant" button in /admin/sync runs the same
 * runFootballSync() directly.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!apiFootballConfigured()) {
    return NextResponse.json({ ok: false, error: "API_FOOTBALL_KEY missing" }, { status: 503 });
  }

  const report = await runFootballSync();
  // League pages are prerendered: purge them so the new scores show.
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, report });
}
