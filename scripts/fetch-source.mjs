import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BOOKS } from "./config.mjs";

const CACHE_DIRECTORY = resolve(".cache/odr");
const REPOSITORY_URL = "https://github.com/janvier-s/original-douay-rheims";
const sleep = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
const hash = (contents) => createHash("sha256").update(contents).digest("hex");

async function assertLocalSources(sourceDirectory) {
  try {
    if (!(await stat(sourceDirectory)).isDirectory()) throw new Error("not a directory");
  } catch (error) {
    throw new Error(`ODR_LOCAL_SOURCE_DIR does not exist or is not a directory: ${sourceDirectory}`, { cause: error });
  }
  const missing = [];
  for (const slug of BOOKS) {
    try { await stat(resolve(sourceDirectory, `${slug}.json`)); }
    catch { missing.push(`${slug}.json`); }
  }
  if (missing.length) {
    throw new Error(`ODR_LOCAL_SOURCE_DIR is missing ${missing.length} required canonical file(s): ${missing.join(", ")}`);
  }
}

async function refreshFromLocal(sourceDirectory, sourceCommit, generatedAt) {
  const absoluteSource = resolve(sourceDirectory);
  // Only the derived cache is removed; a sibling source checkout is untouched.
  await assertLocalSources(absoluteSource);
  await rm(CACHE_DIRECTORY, { recursive: true, force: true });
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const sources = [];
  for (const slug of BOOKS) {
    const sourcePath = resolve(absoluteSource, `${slug}.json`);
    const contents = await readFile(sourcePath, "utf8");
    try { JSON.parse(contents); }
    catch (error) { throw new Error(`Invalid JSON in local source file: ${sourcePath}`, { cause: error }); }
    await writeFile(resolve(CACHE_DIRECTORY, `${slug}.json`), contents);
    sources.push({
      slug,
      url: `${REPOSITORY_URL}/blob/${sourceCommit || "HEAD"}/bible/raw/${slug}.json`,
      sourceType: "local-git-checkout",
      sourceRepository: REPOSITORY_URL,
      sourceCommit: sourceCommit || null,
      fallback: false,
      sha256: hash(contents),
      fetchedAt: generatedAt || null,
    });
  }
  await writeFile(resolve(CACHE_DIRECTORY, "sources.json"), JSON.stringify(sources, null, 2));
  return sources;
}

async function refreshFromNetwork(fetchImplementation, generatedAt) {
  await rm(CACHE_DIRECTORY, { recursive: true, force: true });
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const sources = [];
  for (const slug of BOOKS) {
    const urls = [
      `https://thedouayrheims.com/data/odr/${slug}.json`,
      `https://raw.githubusercontent.com/janvier-s/original-douay-rheims/main/bible/raw/${slug}.json`,
    ];
    let contents;
    let usedUrl;
    let lastError;
    for (let urlIndex = 0; urlIndex < urls.length && !contents; urlIndex += 1) {
      for (let attempt = 0; attempt < 3 && !contents; attempt += 1) {
        try {
          const response = await fetchImplementation(urls[urlIndex], { headers: { "user-agent": "Scripture-Index-data-compiler/1.0" } });
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          contents = await response.text();
          JSON.parse(contents);
          usedUrl = urls[urlIndex];
        } catch (error) {
          contents = undefined;
          lastError = error;
          if (attempt < 2) await sleep(500 * 2 ** attempt);
        }
      }
    }
    if (!contents || !usedUrl) throw new Error(`Unable to download ${slug}: ${lastError?.message}`);
    await writeFile(resolve(CACHE_DIRECTORY, `${slug}.json`), contents);
    sources.push({
      slug, url: usedUrl, sourceType: "network", sourceRepository: REPOSITORY_URL,
      sourceCommit: null, fallback: usedUrl === urls[1], sha256: hash(contents),
      fetchedAt: generatedAt || new Date().toISOString(),
    });
    process.stdout.write(`Downloaded ${slug}\n`);
  }
  await writeFile(resolve(CACHE_DIRECTORY, "sources.json"), JSON.stringify(sources, null, 2));
  return sources;
}

export async function refresh(options = {}) {
  const sourceDirectory = options.localSourceDirectory ?? process.env.ODR_LOCAL_SOURCE_DIR;
  const sourceCommit = options.sourceCommit ?? process.env.ODR_SOURCE_COMMIT;
  const generatedAt = options.generatedAt ?? process.env.ODR_GENERATED_AT;
  if (sourceDirectory) return refreshFromLocal(sourceDirectory, sourceCommit, generatedAt);
  return refreshFromNetwork(options.fetchImplementation ?? globalThis.fetch, generatedAt);
}
