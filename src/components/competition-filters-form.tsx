"use client";

import { useRouter } from "@/i18n/navigation";

type Option = { value: string; label: string };

export function CompetitionFiltersForm({
  labels,
  countries,
  types,
  selected,
}: {
  labels: {
    country: string;
    type: string;
    allCountries: string;
    allTypes: string;
  };
  countries: { slug: string; label: string }[];
  types: Option[];
  selected: { country: string; type: string };
}) {
  const router = useRouter();

  function apply(next: Partial<typeof selected>) {
    const merged = { ...selected, ...next };
    const query = new URLSearchParams();
    if (merged.country) query.set("country", merged.country);
    if (merged.type) query.set("type", merged.type);

    const suffix = query.toString();
    router.push(suffix ? `/competitions?${suffix}` : "/competitions");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        label={labels.country}
        value={selected.country}
        placeholder={labels.allCountries}
        options={countries.map((country) => ({
          value: country.slug,
          label: country.label,
        }))}
        onChange={(value) => apply({ country: value })}
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
