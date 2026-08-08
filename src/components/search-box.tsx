"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

export function SearchBox({
  placeholder,
  label,
}: {
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length === 0) return;
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }}
    >
      <label className="sr-only" htmlFor="site-search">
        {label}
      </label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none"
      />
    </form>
  );
}
