import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { NEWS_FEEDS, FOOTBALL_KEYWORDS } from "@/lib/news-sources";

type CustomItem = {
  mediaThumbnail?: { $: { url?: string } };
  contentEncoded?: string;
};

const parser: Parser<Record<string, unknown>, CustomItem> = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

/** How many of the most recent items to look at per feed on each run. */
const ITEMS_PER_FEED = 25;

/** Excerpt is deliberately short, per the "brève" requirement. */
const EXCERPT_MAX_LENGTH = 220;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function containsFootballKeyword(text: string): boolean {
  const normalized = normalize(text);
  return FOOTBALL_KEYWORDS.some((keyword) => normalized.includes(normalize(keyword)));
}

function matchesKnownEntity(text: string, entityNames: string[]): boolean {
  const normalized = normalize(text);
  return entityNames.some(
    (name) => name.length > 2 && normalized.includes(normalize(name)),
  );
}

/**
 * Feeds expose an item's picture in different ways: a plain <enclosure>,
 * a <media:thumbnail>, or — for feeds like Africa Top Sports — only as an
 * <img> inside the full article HTML. Tries each in that order.
 */
function extractImageUrl(item: Parser.Item & CustomItem): string | null {
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith("image"))) {
    return item.enclosure.url;
  }

  const thumbnailUrl = item.mediaThumbnail?.$?.url;
  if (thumbnailUrl) return thumbnailUrl;

  const html = item.contentEncoded ?? item.content ?? "";
  const match = /<img[^>]+src="([^"]+)"/i.exec(html);
  return match ? match[1] : null;
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;

  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

async function knownEntityNames(): Promise<string[]> {
  const [countries, clubs, players, coaches, competitions] = await Promise.all([
    prisma.country.findMany({ select: { nameFr: true } }),
    prisma.club.findMany({ select: { nameFr: true } }),
    prisma.player.findMany({ select: { name: true } }),
    prisma.coach.findMany({ select: { name: true } }),
    prisma.competition.findMany({ select: { nameFr: true } }),
  ]);

  return [
    ...countries.map((c) => c.nameFr),
    ...clubs.map((c) => c.nameFr),
    ...players.map((p) => p.name),
    ...coaches.map((c) => c.name),
    ...competitions.map((c) => c.nameFr),
  ];
}

export type NewsImportResult = {
  feed: string;
  imported: number;
  error?: string;
};

/**
 * Pulls the latest items from each configured press feed and imports the
 * ones that both mention a club, player, coach, sélection or compétition
 * already on the site AND look like football news (feeds cover all sports
 * or all of Africa, not just football). Every import cites its source, and
 * duplicates are skipped via the unique constraint on NewsItem.sourceUrl.
 */
export async function fetchAndImportNews(): Promise<NewsImportResult[]> {
  const entityNames = await knownEntityNames();
  const results: NewsImportResult[] = [];

  for (const feed of NEWS_FEEDS) {
    let imported = 0;
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items ?? []).slice(0, ITEMS_PER_FEED);

      for (const item of items) {
        const link = item.link;
        const title = item.title;
        if (!link || !title) continue;

        const body = `${title} ${item.contentSnippet ?? item.content ?? ""}`;
        if (!containsFootballKeyword(body) || !matchesKnownEntity(body, entityNames)) {
          continue;
        }

        const excerpt = truncate(item.contentSnippet ?? title, EXCERPT_MAX_LENGTH);
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();
        const imageUrl = extractImageUrl(item);

        const existing = await prisma.newsItem.findUnique({ where: { sourceUrl: link } });
        if (existing) {
          // Backfills the image on items imported before extractImageUrl()
          // existed; leaves everything else untouched in case it was edited.
          if (!existing.imageUrl && imageUrl) {
            await prisma.newsItem.update({ where: { id: existing.id }, data: { imageUrl } });
          }
          continue;
        }

        await prisma.newsItem.create({
          data: {
            title: truncate(title, 160),
            excerpt,
            imageUrl,
            sourceUrl: link,
            sourceName: feed.name,
            origin: "AUTO",
            publishedAt,
          },
        });
        imported += 1;
      }

      results.push({ feed: feed.name, imported });
    } catch (error) {
      results.push({
        feed: feed.name,
        imported,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
