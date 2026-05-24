// SkSL port of @paper-design/shaders' Simplex Noise gradient fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/simplex-noise.ts
//
// Notes on the port:
//   - No vertex shader: v_patternUV is computed inline via paperComputeUVs.
//   - The dynamic indexing into pickColor(i) inside a bounded for-loop compiles under SkSL,
//     but to be safe we replace it with a chained-if lookup helper.
//   - colorBandingFix is dropped (it referenced gl_FragCoord).

import { sizingHelpers, simplexNoise } from "./shader-utils.sksl";

export const SIMPLEX_NOISE_MAX_COLORS = 10;

export const SIMPLEX_NOISE_SKSL = `
${sizingHelpers}
${simplexNoise}

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
uniform float u_stepsPerColor;
uniform float u_softness;

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

float getNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));
  return noise;
}

float steppedSmooth(float m, float steps, float softness) {
  float stepT = floor(m * steps) / steps;
  float f = m * steps - floor(m * steps);
  float fw = steps * 0.001;
  float smoothed = smoothstep(.5 - softness, min(1., .5 + softness + fw), f);
  return stepT + smoothed / steps;
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV;
  vec2 v_patternUV;
  vec2 v_responsiveUV;
  vec2 v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_patternUV;
  shape_uv *= .1;

  float t = .2 * u_time;
  float shape = .5 + .5 * getNoise(shape_uv, t);

  // Paper's u_extraSides is hard-coded true in the original.
  float mixer = (shape - .5 / u_colorsCount) * u_colorsCount;
  float steps = max(1., u_stepsPerColor);

  vec4 gradient = getColor(0);
  gradient.rgb *= gradient.a;

  int count = int(u_colorsCount);
  for (int i = 1; i < ${SIMPLEX_NOISE_MAX_COLORS}; i++) {
    if (i >= count) break;
    float localM = clamp(mixer - float(i - 1), 0., 1.);
    localM = steppedSmooth(localM, steps, .5 * u_softness);
    vec4 c = getColor(i);
    c.rgb *= c.a;
    gradient = mix(gradient, c, localM);
  }

  if ((mixer < 0.) || (mixer > (u_colorsCount - 1.))) {
    float localM = mixer + 1.;
    if (mixer > (u_colorsCount - 1.)) {
      localM = mixer - (u_colorsCount - 1.);
    }
    localM = steppedSmooth(localM, steps, .5 * u_softness);
    vec4 cFst = getColor(0);
    cFst.rgb *= cFst.a;
    vec4 cLast = getColor(int(u_colorsCount - 1.));
    cLast.rgb *= cLast.a;
    gradient = mix(cLast, cFst, localM);
  }

  vec3 color = gradient.rgb;
  float opacity = gradient.a;
  return vec4(color, opacity);
}
`;
