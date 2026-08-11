/**
 * Curated press feeds for automatic news import (see news-fetch.ts).
 * Kept to a short, hand-picked list of reference outlets rather than a
 * generic aggregator, so every citation on the site points to a source
 * worth trusting.
 */
export type NewsFeed = { name: string; url: string };

export const NEWS_FEEDS: NewsFeed[] = [
  { name: "RFI Sport", url: "https://www.rfi.fr/fr/sport/rss" },
  { name: "BBC Afrique", url: "https://feeds.bbci.co.uk/afrique/rss.xml" },
  { name: "Jeune Afrique", url: "https://www.jeuneafrique.com/feed/" },
  { name: "Africa Top Sports", url: "https://www.africatopsports.com/feed/" },
];

/**
 * None of the feeds above are football-only, so every candidate article
 * must also contain one of these terms before it is imported — on top of
 * naming a club, joueur, entraîneur, sélection or compétition already
 * registered on the site.
 */
export const FOOTBALL_KEYWORDS = [
  "football",
  "footballeur",
  "footballeuse",
  "foot",
  "sélectionneur",
  "sélection nationale",
  "can 20",
  "chan",
  "caf ",
  "ligue des champions",
  "coupe de la confédération",
  "supercoupe",
  "wafcon",
  "mondial",
  "coupe du monde",
  "éliminatoires",
  "match amical",
  "transfert",
  "mercato",
  "championnat",
  "ballon d'or",
  "afcon",
];
