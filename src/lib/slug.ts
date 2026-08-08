const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

export function slugify(input: string): string {
  const withoutDiacritics = Array.from(input.normalize("NFD"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_MARK_START || code > COMBINING_MARK_END;
    })
    .join("");

  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
