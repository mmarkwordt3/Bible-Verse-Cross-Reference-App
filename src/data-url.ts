/** Resolve a generated data asset relative to the deployed document directory. */
export function resolveDataUrl(relativePath: string, baseUrl: string = document.baseURI): string {
  const normalizedPath = relativePath.replace(/^\/+/, "");
  if (!normalizedPath) throw new Error("A data asset path is required");
  return new URL(`data/${normalizedPath}`, baseUrl).href;
}
