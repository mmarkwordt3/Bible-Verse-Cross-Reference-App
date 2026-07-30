import { describe, expect, it } from "vitest";
import { resolveDataUrl } from "../src/data-url";

const projectBase = "https://USERNAME.github.io/REPOSITORY-NAME/";

describe("resolveDataUrl", () => {
  it("preserves the GitHub Pages repository subdirectory", () => {
    expect(resolveDataUrl("manifest.json", projectBase)).toBe(
      "https://username.github.io/REPOSITORY-NAME/data/manifest.json",
    );
    expect(resolveDataUrl("manifest.json", projectBase)).not.toBe(
      "https://username.github.io/data/manifest.json",
    );
  });

  it("resolves lazy-loaded per-book data under the project", () => {
    expect(resolveDataUrl("books/john.json", projectBase)).toBe(
      "https://username.github.io/REPOSITORY-NAME/data/books/john.json",
    );
  });

  it("strips accidental leading slashes", () => {
    expect(resolveDataUrl("/rankings.json", projectBase)).toBe(
      "https://username.github.io/REPOSITORY-NAME/data/rankings.json",
    );
  });

  it("is unaffected by a hash route", () => {
    const routedBase = `${projectBase}#/verse/john/3/16`;
    expect(resolveDataUrl("data-quality.json", routedBase)).toBe(
      "https://username.github.io/REPOSITORY-NAME/data/data-quality.json",
    );
  });
});
