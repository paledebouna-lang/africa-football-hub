/**
 * Extracts the video id from the YouTube URL shapes people actually paste:
 * watch links, short links, /embed/, /shorts/ and /live/.
 * Returns null for anything else, so a bad link renders as a plain link
 * rather than an empty player.
 */
export function youtubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isYoutube =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be";

  if (!isYoutube) return null;

  const candidate =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)?.[1] ??
        "");

  return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

/** Privacy-preserving embed host: no tracking cookie until the visitor plays. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
