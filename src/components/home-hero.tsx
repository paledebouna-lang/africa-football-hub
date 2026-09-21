import { Link } from "@/i18n/navigation";
import { youtubeVideoId } from "@/lib/youtube";
import { isDirectVideoUrl } from "@/lib/hero-video";

/**
 * Home page hero. With an active video — a YouTube link or an uploaded file —
 * it plays muted and looped behind the headline; without one, or for visitors
 * who prefer reduced motion, it falls back to the plain blue panel.
 */
export function HomeHero({
  videoUrl,
  title,
  subtitle,
  ctaHref,
  ctaLabel,
}: {
  videoUrl: string | null;
  title: string;
  subtitle: string;
  ctaHref: "/competitions";
  ctaLabel: string;
}) {
  const videoId = videoUrl ? youtubeVideoId(videoUrl) : null;
  const fileUrl = videoUrl && !videoId && isDirectVideoUrl(videoUrl) ? videoUrl : null;

  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-brand-strong text-white">
      {(videoId || fileUrl) && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 [container-type:size] motion-reduce:hidden"
        >
          {fileUrl && (
            <video
              src={fileUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {videoId && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&disablekb=1`}
              title=""
              tabIndex={-1}
              allow="autoplay; encrypted-media"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 border-0"
            />
          )}
          <div className="absolute inset-0 bg-brand-strong/55" />
        </div>
      )}

      <div className="px-6 py-10 sm:px-10 sm:py-20">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-white/85">{subtitle}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-block rounded bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
        >
          {ctaLabel}
        </Link>
      </div>
      <div className="h-1.5 bg-accent" />
    </section>
  );
}
