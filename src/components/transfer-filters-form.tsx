"use client";

import { useRouter } from "@/i18n/navigation";

type Option = { value: string; label: string };

export function TransferFiltersForm({
  labels,
  leagues,
  seasons,
  types,
  selected,
}: {
  labels: {
    league: string;
    season: string;
    type: string;
    allLeagues: string;
    allSeasons: string;
    allTypes: string;
  };
  leagues: { slug: string; label: string }[];
  seasons: { id: string; label: string }[];
  types: Option[];
  selected: { league: string; season: string; type: string };
}) {
  const router = useRouter();

  function apply(next: Partial<typeof selected>) {
    const merged = { ...selected, ...next };
    const query = new URLSearchParams();
    if (merged.league) query.set("league", merged.league);
    if (merged.season) query.set("season", merged.season);
    if (merged.type) query.set("type", merged.type);

    const suffix = query.toString();
    router.push(suffix ? `/transfers?${suffix}` : "/transfers");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        label={labels.league}
        value={selected.league}
        placeholder={labels.allLeagues}
        options={leagues.map((league) => ({
          value: league.slug,
          label: league.label,
        }))}
        onChange={(value) => apply({ league: value })}
      />
      <Select
        label={labels.season}
        value={selected.season}
        placeholder={labels.allSeasons}
        options={seasons.map((season) => ({
          value: season.id,
          label: season.label,
        }))}
        onChange={(value) => apply({ season: value })}
      />
      <Select
        label={labels.type}
        value={selected.type}
        placeholder={labels.allTypes}
        options={types}
        onChange={(value) => apply({ type: value })}
      />
    </div>
  );
}

function Select({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="block text-muted mb-1">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
