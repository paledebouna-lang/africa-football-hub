import type { Consensus } from "@/lib/community";
import { MIN_VOTES_TO_COUNT } from "@/lib/valuation";

/**
 * What the community thinks, and whether it is counting yet. Showing the spread
 * as well as the median makes a divided verdict visible instead of hiding it
 * behind a single confident-looking number.
 */
export function CommunityPanel({
  consensus,
  formatValue,
  labels,
}: {
  consensus: Consensus | null;
  formatValue: (value: number) => string;
  labels: Record<string, string>;
}) {
  if (!consensus) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">{labels.empty}</p>
      </div>
    );
  }

  const counting = consensus.voteCount >= MIN_VOTES_TO_COUNT;
  const spread = consensus.highestUsd - consensus.lowestUsd;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {labels.consensus}
          </p>
          <p className="mt-0.5 text-xl font-bold text-brand">
            {formatValue(consensus.consensusUsd)}
          </p>
        </div>
        <p className="text-sm text-muted">
          {labels.votes.replace("{count}", String(consensus.voteCount))}
        </p>
      </div>

      {spread > 0 && (
        <p className="mt-2 text-xs text-muted">
          {labels.range
            .replace("{low}", formatValue(consensus.lowestUsd))
            .replace("{high}", formatValue(consensus.highestUsd))}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        {counting
          ? labels.counting
          : labels.notCounting.replace("{needed}", String(MIN_VOTES_TO_COUNT))}
      </p>
    </div>
  );
}
