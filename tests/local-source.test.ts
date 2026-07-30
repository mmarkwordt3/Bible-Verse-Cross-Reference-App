import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BOOKS, EXCLUDED } from "../scripts/config.mjs";
import { refresh } from "../scripts/fetch-source.mjs";

let temporaryRoot: string | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  await rm(".cache/odr", { recursive: true, force: true });
});

async function fixture() {
  temporaryRoot = await mkdtemp(join(tmpdir(), "scripture-index-local-"));
  const source = join(temporaryRoot, "original", "bible", "raw");
  await mkdir(source, { recursive: true });
  for (const slug of BOOKS) await writeFile(join(source, `${slug}.json`), "{}\n");
  return source;
}

describe("local ODR source refresh", () => {
  it("requires every canonical file and gives a useful error", async () => {
    const source = await fixture();
    await rm(join(source, "genesis.json"));
    await expect(refresh({ localSourceDirectory: source })).rejects.toThrow(/missing 1 required canonical file.*genesis\.json/);
  });

  it("copies exactly 73 canonical files without network access", async () => {
    const source = await fixture();
    for (const slug of EXCLUDED) await writeFile(join(source, `${slug}.json`), "{}\n");
    const fetchImplementation = vi.fn(() => { throw new Error("network must not be called"); });
    const metadata = await refresh({ localSourceDirectory: source, fetchImplementation });
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(metadata).toHaveLength(73);
    expect(metadata.map((item) => item.slug)).not.toEqual(expect.arrayContaining(EXCLUDED));
  });

  it("preserves commit metadata, hashes sources, and leaves the checkout intact", async () => {
    const source = await fixture();
    const marker = join(temporaryRoot!, "original", ".git-marker");
    await writeFile(marker, "keep");
    const [first] = await refresh({
      localSourceDirectory: source,
      sourceCommit: "abc123",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(first.sourceCommit).toBe("abc123");
    expect(first.sourceType).toBe("local-git-checkout");
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await readFile(marker, "utf8")).toBe("keep");
    expect(JSON.parse(await readFile(".cache/odr/sources.json", "utf8"))).toHaveLength(73);
  });
});
