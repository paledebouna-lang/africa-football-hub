import type { Field } from "@/components/admin-form";

type NewsDefaults = {
  title?: string;
  excerpt?: string;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  publishedAt?: Date;
};

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function newsFields(defaults: NewsDefaults = {}): Field[] {
  return [
    {
      kind: "text",
      name: "title",
      label: "Titre",
      required: true,
      defaultValue: defaults.title,
      hint: "Ex. « Yan Diomande file au Real Madrid pour 125 M€ ».",
    },
    {
      kind: "date",
      name: "publishedAt",
      label: "Date de publication",
      defaultValue: toDateInputValue(defaults.publishedAt),
    },
    {
      kind: "image",
      name: "imageUrl",
      label: "Image",
      folder: "news",
      defaultValue: defaults.imageUrl,
      hint: "Photo du joueur, écusson du club, ou tout visuel libre de droit.",
    },
    {
      kind: "text",
      name: "excerpt",
      label: "Résumé",
      required: true,
      defaultValue: defaults.excerpt,
      hint: "Quelques lignes : l'essentiel de l'information.",
    },
    {
      kind: "text",
      name: "sourceName",
      label: "Source (facultatif)",
      defaultValue: defaults.sourceName ?? "",
      hint: "Ex. « RFI Sport », « communiqué du club »... Affiché comme citation sur la fiche.",
    },
    {
      kind: "url",
      name: "sourceUrl",
      label: "Lien source (facultatif)",
      defaultValue: defaults.sourceUrl ?? "",
      hint: "Article ou publication d'origine, si disponible.",
    },
  ];
}
