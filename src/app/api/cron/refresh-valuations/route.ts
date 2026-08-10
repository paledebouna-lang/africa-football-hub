import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshPlayerValuation } from "@/lib/refresh-valuation";

/**
 * Quarterly valuation sweep. Vercel Cron hits this on a schedule (see
 * vercel.json) so every player's value moves — up, down, or stays put — even
 * for a player with no match sheet, transfer, or vote that quarter. Age and
 * contract countdown alone are enough to shift the model's answer over time;
 * this is what makes that visible instead of a value freezing forever.
 *
 * refreshPlayerValuation already skips MANUAL values and no-ops when the
 * computed figure hasn't moved, so running this against every player is safe.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await prisma.player.findMany({ select: { id: true } });

  let refreshed = 0;
  for (const { id } of players) {
    await refreshPlayerValuation(id);
    refreshed += 1;
  }

  return NextResponse.json({ ok: true, playersChecked: refreshed });
}
