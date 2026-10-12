import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/*
  Parite des catalogues de messages.

  Le typage TypeScript (global.d.ts) garantit que le CODE n'utilise que des
  cles presentes dans fr.json. Ce script garantit l'autre moitie : que en.json
  contient exactement les memes cles, et que chaque message y attend les memes
  arguments ICU ({count}, {name}...). Une cle oubliee afficherait sa propre
  cle a l'ecran sur /en ; un argument manquant planterait au rendu.
*/

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** Noms d'arguments ICU de premier niveau : `{count, plural, ...}` -> count. */
function icuArguments(message: string): string[] {
  const names = new Set<string>();
  const re = /\{\s*([a-zA-Z0-9_]+)\s*[,}]/g;
  for (const match of message.matchAll(re)) names.add(match[1]);
  return [...names].sort();
}

const reference = flatten(fr as Tree);
const translated = flatten(en as Tree);

let failures = 0;
function fail(message: string) {
  failures++;
  console.log(`  ECHEC ${message}`);
}

console.log("\n=== Cles presentes dans fr.json et absentes de en.json ===");
for (const key of reference.keys()) {
  if (!translated.has(key)) fail(`manquante en anglais : ${key}`);
}

console.log("\n=== Cles presentes dans en.json et absentes de fr.json ===");
for (const key of translated.keys()) {
  if (!reference.has(key)) fail(`orpheline en anglais : ${key}`);
}

console.log("\n=== Arguments ICU identiques dans les deux langues ===");
for (const [key, frMessage] of reference) {
  const enMessage = translated.get(key);
  if (enMessage === undefined) continue;
  const a = icuArguments(frMessage).join(",");
  const b = icuArguments(enMessage).join(",");
  if (a !== b) fail(`${key} : fr attend {${a}} mais en attend {${b}}`);
}

console.log("\n=== Messages vides ===");
for (const [key, message] of [...reference, ...translated]) {
  if (message.trim().length === 0) fail(`vide : ${key}`);
}

console.log(
  `\n${reference.size} cles de reference. ${failures === 0 ? "TOUT PASSE" : `${failures} ECHEC(S)`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
