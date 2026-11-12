import { SHADERS, type ShaderEntry } from "react-native-paper-shaders";

/**
 * The catalogue of shaders this playground can convert: every shader in
 * `react-native-paper-shaders`, keyed by the component name Paper's editor
 * exports. Registry ids are kebab-case versions of the component name
 * ("halftone-cmyk" -> "HalftoneCmyk"), which is also the ejected file name.
 */
export type CatalogueEntry = ShaderEntry & {
  /** PascalCase component identifier, as it appears in a Paper snippet. */
  componentName: string;
  /** Set when the RN port is knowingly not pixel-equivalent to Paper's. */
  degraded?: string;
};

const pascal = (id: string) =>
  id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

// From the library's README "Limitations": shaders whose Paper original samples
// an input image or a curated noise texture, which the port stands in for.
const DEGRADED: Record<string, string> = {
  "image-dithering":
    "Paper dithers an input image; this port has no image input and dithers a procedural gradient instead.",
  "fluted-glass":
    "Paper refracts an input image; this port refracts a procedural stand-in.",
  heatmap:
    "Paper reads an input image's luminance; this port uses a procedural field.",
  water: "The image mode is stubbed with a procedural stand-in.",
  "gem-smoke":
    "The image mode is stubbed, and the swirl is less stretch-adaptive (SkSL has no derivatives).",
  "liquid-metal": "The image mode is stubbed with a procedural stand-in.",
  "paper-texture": "The image mode is stubbed with a procedural stand-in.",
};

export const CATALOGUE: CatalogueEntry[] = SHADERS.map((entry) => ({
  ...entry,
  componentName: pascal(entry.id),
  degraded: DEGRADED[entry.id],
}));

export const BY_COMPONENT_NAME = new Map(
  CATALOGUE.map((entry) => [entry.componentName, entry]),
);

export const PAPER_PACKAGES = [
  "@paper-design/shaders-react",
  "@paper-design/shaders",
];

export const TARGET_PACKAGE = "react-native-paper-shaders";
