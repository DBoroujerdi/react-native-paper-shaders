// SkSL stub for @paper-design/shaders' heatmap fragment shader.
// Source: packages/shaders/src/shaders/heatmap.ts
//
// IMPORTANT: This is a stub. Paper's heatmap is a *texture-based* effect: it samples a
// pre-processed image (R = contour, G = outer blur, B = inner blur) computed in JS via
// canvas+box-blurs, and uses textureGrad / textureSize for the inner glow. We can't ship a
// sampler2D into a Skia RuntimeEffect from the JS side here (no texture path is wired in
// our _shared / Shader plumbing), so this shader compiles and renders a solid colorBack so
// the gallery card doesn't crash. Real port needs a Skia image binding for u_image.

import { declarePI } from "./shader-utils.sksl";

export const HEATMAP_SKSL = `
${declarePI}

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform vec4 u_colorBack;
uniform vec4 u_color0;
uniform float u_colorsCount;

uniform float u_angle;
uniform float u_noise;
uniform float u_innerGlow;
uniform float u_outerGlow;
uniform float u_contour;

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;
  // Stub: image sampling not wired through to SkSL yet. Show colorBack (premultiplied)
  // so the gallery card still renders something stable.
  vec3 bg = u_colorBack.rgb * u_colorBack.a;
  return vec4(bg, u_colorBack.a);
}
`;
