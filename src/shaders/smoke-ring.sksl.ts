// SkSL port of @paper-design/shaders' Smoke Ring fragment shader.
// Source: packages/shaders/src/shaders/smoke-ring.ts
//
// Paper samples a noise texture via `randomR(p)`; we substitute Paper's procedural
// hash21 so we don't have to ship a texture asset.

import {
  declarePI,
  proceduralHash11,
  proceduralHash21,
  sizingHelpers,
} from "./shader-utils.sksl";

export const SMOKE_RING_MAX_COLORS = 10;
export const SMOKE_RING_MAX_NOISE_ITERATIONS = 8;

export const SMOKE_RING_SKSL = `
${declarePI}
${proceduralHash11}
${proceduralHash21}

uniform float u_time;

uniform vec4  u_colorBack;
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
uniform float u_colorsCount;

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

uniform float u_thickness;
uniform float u_radius;
uniform float u_innerShape;
uniform float u_noiseScale;
uniform float u_noiseIterations;

${sizingHelpers}

float randomR(vec2 p) {
  return hash21(floor(p));
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec2 fbm(vec2 n0, vec2 n1) {
  vec2 total = vec2(0.0);
  float amplitude = .4;
  for (int i = 0; i < 8; i++) {
    if (i >= int(u_noiseIterations)) break;
    total.x += valueNoise(n0) * amplitude;
    total.y += valueNoise(n1) * amplitude;
    n0 *= 1.99;
    n1 *= 1.99;
    amplitude *= 0.65;
  }
  return total;
}

float getNoise(vec2 uv, vec2 pUv, float t) {
  vec2 pUvLeft = pUv + .03 * t;
  float period = max(abs(u_noiseScale * TWO_PI), 1e-6);
  vec2 pUvRight = vec2(fract(pUv.x / period) * period, pUv.y) + .03 * t;
  vec2 noise = fbm(pUvLeft, pUvRight);
  return mix(noise.y, noise.x, smoothstep(-.25, .25, uv.x));
}

float getRingShape(vec2 uv) {
  float radius = u_radius;
  float thickness = u_thickness;

  float d = length(uv);
  float ringValue = 1. - smoothstep(radius, radius + thickness, d);
  ringValue *= smoothstep(radius - pow(u_innerShape, 3.) * thickness, radius, d);

  return ringValue;
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 objectUV, patternUV, responsiveUV, responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, objectUV, patternUV, responsiveUV, responsiveBoxGivenSize);

  vec2 shape_uv = objectUV;
  float t = u_time;

  float cycleDuration = 3.;
  float period2 = 2.0 * cycleDuration;
  float localTime1 = fract((0.1 * t + cycleDuration) / period2) * period2;
  float localTime2 = fract((0.1 * t) / period2) * period2;
  float timeBlend = .5 + .5 * sin(.1 * t * PI / cycleDuration - .5 * PI);

  float atg = atan(shape_uv.y, shape_uv.x) + .001;
  float l = length(shape_uv);
  float radialOffset = .5 * l - inversesqrt(max(1e-4, l));
  vec2 polar_uv1 = vec2(atg, localTime1 - radialOffset) * u_noiseScale;
  vec2 polar_uv2 = vec2(atg, localTime2 - radialOffset) * u_noiseScale;

  float noise1 = getNoise(shape_uv, polar_uv1, t);
  float noise2 = getNoise(shape_uv, polar_uv2, t);

  float noise = mix(noise1, noise2, timeBlend);

  shape_uv *= (.8 + 1.2 * noise);

  float ringShape = getRingShape(shape_uv);

  float mixer = ringShape * ringShape * (u_colorsCount - 1.);
  int idxLast = int(u_colorsCount) - 1;
  vec4 gradient = pickColor(idxLast);
  gradient.rgb *= gradient.a;
  for (int i = ${SMOKE_RING_MAX_COLORS} - 2; i >= 0; i--) {
    float localT = clamp(mixer - float(idxLast - i - 1), 0., 1.);
    vec4 c = pickColor(i);
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  vec3 color = gradient.rgb * ringShape;
  float opacity = gradient.a * ringShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  return vec4(color, opacity);
}
`;
