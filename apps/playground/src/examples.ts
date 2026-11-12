import type { CatalogueEntry } from "./catalogue";

/**
 * Builds a snippet in the shape Paper's editor exports (CSS strings, `outline`,
 * `@paper-design/shaders-react` import) from the shader's own default preset,
 * so every shader in the catalogue has something to paste.
 */
export function makeExample(entry: CatalogueEntry): string {
  const attributes = Object.entries(entry.defaultProps)
    .filter(([key]) => key !== "style")
    .map(([key, value]) =>
      typeof value === "string"
        ? `${key}="${value}"`
        : `${key}={${JSON.stringify(value)}}`,
    );

  const style =
    "{{ backgroundColor: '#E2ECF6', height: '240px', outline: '1px solid #B0D4F5', width: '360px' }}";

  return [
    `import { ${entry.componentName} } from '@paper-design/shaders-react';`,
    "",
    `<${entry.componentName} ${attributes.join(" ")}`,
    `  style=${style} />`,
    "",
  ].join("\n");
}

/** The snippet the port was originally built against (see the repo README). */
export const DITHERING_EXAMPLE = `import { Dithering } from '@paper-design/shaders-react';

<Dithering
  speed={0.25}
  shape="warp"
  type="4x4"
  size={4}
  scale={1}
  frame={5929.724999967142}
  colorBack="#00000000"
  colorFront="#99CDFC"
  style={{
    backgroundColor: '#E2ECF6',
    height: '319px',
    outline: '1px solid #B0D4F5',
    width: '511px',
  }}
/>
`;
