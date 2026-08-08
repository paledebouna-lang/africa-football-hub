import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "C:/Users/PC/Documents/africa-football-hub/src";
const SKIP = new Set(["generated", "node_modules"]);

// Ordered: longer identifiers first so shorter ones don't corrupt them.
const REPLACEMENTS = [
  ["formatEurFull", "formatUsdFull"],
  ["formatEur", "formatUsd"],
  ["marketValueEur", "marketValueUsd"],
  ["valueEur", "valueUsd"],
  ["feeEur", "feeUsd"],
  ["amountEur", "amountUsd"],
  // Hardcoded formatters and French labels left behind by the identifier rename.
  ['currency: "EUR"', 'currency: "USD"'],
  ["const euro = new Intl.NumberFormat", "const money = new Intl.NumberFormat"],
  ["euro.format(", "money.format("],
  ["Montant (€)", "Montant ($)"],
  ["Valeur marchande (€)", "Valeur marchande ($)"],
  ["En euros, sans espaces", "En dollars, sans espaces"],
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = readFileSync(file, "utf8");
  let updated = original;

  for (const [from, to] of REPLACEMENTS) {
    updated = updated.replaceAll(from, to);
  }

  if (updated !== original) {
    writeFileSync(file, updated, "utf8");
    changed += 1;
    console.log(`  ${file.replace(ROOT, "src")}`);
  }
}

console.log(`\n${changed} fichiers modifiés.`);
