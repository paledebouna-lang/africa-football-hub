import { youtubeVideoId, youtubeEmbedUrl } from "@/lib/youtube";

type Video = {
  id: string;
  url: string;
  title: string | null;
  type: string;
};

export function VideoGallery({
  videos,
  typeLabel,
  fallbackLinkLabel,
}: {
  videos: Video[];
  typeLabel: (type: string) => string;
  fallbackLinkLabel: string;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {videos.map((video) => {
        const videoId = youtubeVideoId(video.url);

        return (
          <li
            key={video.id}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            {videoId ? (
              <div className="aspect-video">
                <iframe
                  src={youtubeEmbedUrl(videoId)}
                  title={video.title ?? typeLabel(video.type)}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
            ) : (
              // Unrecognised link: never render an empty player, offer the link instead.
              <div className="p-4">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline break-all"
                >
                  {fallbackLinkLabel}
                </a>
              </div>
            )}

            <div className="p-3">
              <p className="text-xs text-muted">{typeLabel(video.type)}</p>
              {video.title && <p className="mt-0.5 font-medium">{video.title}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
