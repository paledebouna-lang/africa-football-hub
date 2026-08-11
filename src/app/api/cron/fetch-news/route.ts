import { NextRequest, NextResponse } from "next/server";
import { fetchAndImportNews } from "@/lib/news-fetch";

/**
 * Daily press sweep. Vercel Cron hits this on a schedule (see vercel.json);
 * the admin's "Actualiser maintenant" button in /admin/news calls the same
 * fetchAndImportNews() function directly for an on-demand refresh.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await fetchAndImportNews();
  return NextResponse.json({ ok: true, results });
}
