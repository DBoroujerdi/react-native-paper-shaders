// SkSL port of @paper-design/shaders' Warp fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/warp.ts
//
// Notes on the port:
//   - Paper's randomG / valueNoise samples a noise texture (sampler2D). Runtime effects can't
//     ship samplers, so we substitute Paper's procedural hash21 + valueNoise21 from
//     shader-utils.sksl. Visual character is preserved (smooth value noise) though the per-cell
//     distribution differs slightly from the curated texture.
//   - v_patternUV is computed inline via paperComputeUVs.
//   - u_colors is a fixed vec4[10] uniform; chained-if lookup avoids dynamic indexing issues.

import {
  declarePI,
  proceduralHash21,
  rotation2,
  sizingHelpers,
  valueNoise21,
} from "./shader-utils.sksl";

export const WARP_MAX_COLORS = 10;

export const WARP_PATTERNS = {
  checks: 0,
  stripes: 1,
  edge: 2,
} as const;

export type WarpPattern = keyof typeof WARP_PATTERNS;

export const WARP_SKSL = `
${declarePI}
${proceduralHash21}
${valueNoise21}
${rotation2}
${sizingHelpers}

uniform float u_time;

// SkSL forbids dynamic indexing into uniform arrays in RuntimeEffects, so each
// color slot is its own uniform and pickColor(int) does the chained-if lookup.
uniform vec4  u_color0;
uniform vec4  u_color1;
uniform vec4  u_color2;
uniform vec4  u_color3;
uniform vec4  u_color4;
uniform vec4  u_color5;
uniform vec4  u_color6;
uniform vec4  u_color7;
uniform vec4  u_color8;
uniform vec4  u_color9;

vec4 pickColor(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  if (i == 4) return u_color4;
  if (i == 5) return u_color5;
  if (i == 6) return u_color6;
  if (i == 7) return u_color7;
  if (i == 8) return u_color8;
  return u_color9;
}
uniform float u_colorsCount;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

vec4 getColor(int i) {
  if (i == 0) return pickColor(0);
  if (i == 1) return pickColor(1);
  if (i == 2) return pickColor(2);
  if (i == 3) return pickColor(3);
  if (i == 4) return pickColor(4);
  if (i == 5) return pickColor(5);
  if (i == 6) return pickColor(6);
  if (i == 7) return pickColor(7);
  if (i == 8) return pickColor(8);
  return pickColor(9);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV;
  vec2 v_patternUV;
  vec2 v_responsiveUV;
  vec2 v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 uv = v_patternUV;
  uv *= .5;

  const float firstFrameOffset = 118.;
  float t = 0.0625 * (u_time + firstFrameOffset);

  float n1 = valueNoise21(uv * 1. + t);
  float n2 = valueNoise21(uv * 2. - t);
  float angle = n1 * TWO_PI;
  uv.x += 4. * u_distortion * n2 * cos(angle);
  uv.y += 4. * u_distortion * n2 * sin(angle);

  float swirl = u_swirl;
  for (int i = 1; i <= 20; i++) {
    if (i >= int(u_swirlIterations)) break;
    float iFloat = float(i);
    uv.x += swirl / iFloat * cos(t + iFloat * 1.5 * uv.y);
    uv.y += swirl / iFloat * cos(t + iFloat * 1. * uv.x);
  }

  float proportion = clamp(u_proportion, 0., 1.);

  float shape = 0.;
  if (u_shape < .5) {
    vec2 checksShape_uv = uv * (.5 + 3.5 * u_shapeScale);
    shape = .5 + .5 * sin(checksShape_uv.x) * cos(checksShape_uv.y);
    shape += .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else if (u_shape < 1.5) {
    vec2 stripesShape_uv = uv * (2. * u_shapeScale);
    float f = fract(stripesShape_uv.y);
    shape = smoothstep(.0, .55, f) * (1.0 - smoothstep(.45, 1., f));
    shape += .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else {
    float shapeScaling = 5. * (1. - u_shapeScale);
    float e0 = 0.45 - shapeScaling;
    float e1 = 0.55 + shapeScaling;
    shape = smoothstep(min(e0, e1), max(e0, e1), 1.0 - uv.y + 0.3 * (proportion - 0.5));
  }

  float mixer = shape * (u_colorsCount - 1.);
  vec4 gradient = getColor(0);
  gradient.rgb *= gradient.a;
  float aa = 0.001;
  int count = int(u_colorsCount);
  for (int i = 1; i < ${WARP_MAX_COLORS}; i++) {
    if (i >= count) break;
    float m = clamp(mixer - float(i - 1), 0.0, 1.0);
    float localMixerStart = floor(m);
    float softness = .5 * u_softness + 0.001;
    float smoothed = smoothstep(max(0., .5 - softness - aa), min(1., .5 + softness + aa), m - localMixerStart);
    float stepped = localMixerStart + smoothed;
    m = mix(stepped, m, u_softness);
    vec4 c = getColor(i);
    c.rgb *= c.a;
    gradient = mix(gradient, c, m);
  }

  vec3 color = gradient.rgb;
  float opacity = gradient.a;
  return vec4(color, opacity);
}
`;
