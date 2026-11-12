// The library's TypeScript source, inlined at build time. The playground both
// renders these modules (via the RN shims) and re-emits them as the ejected,
// dependency-free component.
const PATTERN_PREFIX = "../../../../packages/shaders/src/";

const modules = import.meta.glob("../../../../packages/shaders/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Library-relative path (e.g. "shaders/Dithering.tsx") -> source text. */
export const LIBRARY_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([key, value]) => [
    key.slice(key.indexOf(PATTERN_PREFIX) === -1 ? 0 : PATTERN_PREFIX.length),
    value,
  ]),
);

export function resolveLibraryPath(fromFile: string, specifier: string): string | null {
  const segments = fromFile.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  const base = segments.join("/");
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (LIBRARY_SOURCES[candidate] !== undefined) return candidate;
  }
  return null;
}
