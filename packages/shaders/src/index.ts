// Public API for react-native-paper-shaders.
//
// Each shader module exports its component, a `<Name>Props` type, and any
// per-shader enum maps/types (e.g. DOT_GRID_SHAPE_MAP); all are re-exported
// here so consumers get the full typed surface from the package root.

// Catalogue of every shader with its Paper default preset (drives the gallery,
// useful for consumer demo/browse UIs too).
export { SHADERS } from "./shaders/registry";
export type { ShaderComponent, ShaderEntry } from "./shaders/registry";

// Authoring helpers for building additional SkSL shaders in the same style.
export { makeShader, useShaderTime, useShaderSize } from "./shaders/_shared";
export { parseCssColor } from "./color";
export type { Rgba } from "./color";
export * from "./enums";

// Shader components.
export * from "./shaders/ColorPanels";
export * from "./shaders/Dithering";
export * from "./shaders/DotGrid";
export * from "./shaders/DotOrbit";
export * from "./shaders/FlutedGlass";
export * from "./shaders/GemSmoke";
export * from "./shaders/GodRays";
export * from "./shaders/GrainGradient";
export * from "./shaders/HalftoneCmyk";
export * from "./shaders/HalftoneDots";
export * from "./shaders/Heatmap";
export * from "./shaders/ImageDithering";
export * from "./shaders/LiquidMetal";
export * from "./shaders/MeshGradient";
export * from "./shaders/Metaballs";
export * from "./shaders/NeuroNoise";
export * from "./shaders/PaperTexture";
export * from "./shaders/PerlinNoise";
export * from "./shaders/PulsingBorder";
export * from "./shaders/SimplexNoise";
export * from "./shaders/SmokeRing";
export * from "./shaders/Spiral";
export * from "./shaders/StaticMeshGradient";
export * from "./shaders/StaticRadialGradient";
export * from "./shaders/Swirl";
export * from "./shaders/Voronoi";
export * from "./shaders/Warp";
export * from "./shaders/Water";
export * from "./shaders/Waves";
