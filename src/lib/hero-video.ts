import { youtubeVideoId } from "@/lib/youtube";

/** A video file the browser can play natively, as opposed to a YouTube page. */
export function isDirectVideoUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    return /^https?:$/.test(url.protocol) && /\.(mp4|webm)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function isValidHeroVideo(rawUrl: string): boolean {
  return youtubeVideoId(rawUrl) !== null || isDirectVideoUrl(rawUrl);
}
