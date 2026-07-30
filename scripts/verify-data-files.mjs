import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { BOOKS } from "./config.mjs";

const mode = process.argv[2];
if (mode !== "public" && mode !== "dist") {
  throw new Error("Usage: node scripts/verify-data-files.mjs <public|dist>");
}

const root = resolve(mode === "public" ? "public/data" : "dist/data");
const required = [
  "manifest.json",
  "rankings.json",
  "book-stats.json",
  "data-quality.json",
  ...BOOKS.map((slug) => `books/${slug}.json`),
];
const missing = [];
const empty = [];
for (const relativePath of required) {
  const filePath = resolve(root, relativePath);
  try {
    await access(filePath);
    if ((await stat(filePath)).size === 0) empty.push(relativePath);
  } catch {
    missing.push(relativePath);
  }
}
if (missing.length || empty.length) {
  const location = mode === "public" ? "generated public data" : "built deployment data";
  const details = [
    missing.length ? `missing: ${missing.join(", ")}` : "",
    empty.length ? `empty: ${empty.join(", ")}` : "",
  ].filter(Boolean).join("; ");
  throw new Error(`Required ${location} is incomplete (${details}). ${mode === "public" ? "Run the bootstrap data workflow or npm run data:refresh first." : "Ensure Vite copied public/data into dist/data."}`);
}
console.log(`Verified ${required.length} required ${mode}/data files, including ${BOOKS.length} book files.`);
