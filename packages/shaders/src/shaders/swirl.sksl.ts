// SkSL port of @paper-design/shaders' Swirl fragment shader.
// Source: packages/shaders/src/shaders/swirl.ts
//
// Notes:
//   - Uses v_objectUV (object-style sizing) from the shared sizingHelpers.
//   - u_colors is a uniform vec4 array of size 10; SkSL supports this directly.
//   - The loop runs i in [1, maxColorCount+1), original Paper-side. Note
//     SkSL allows constant-bounded for loops with dynamic break.
//   - colorBandingFix uses captured fragCoord.

import { declarePI, simplexNoise, sizingHelpers } from "./shader-utils.sksl";

export const SWIRL_MAX_COLORS = 10;

export const SWIRL_SKSL = `
${declarePI}

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
uniform float u_bandCount;
uniform float u_twist;
uniform float u_center;
uniform float u_proportion;
uniform float u_softness;
uniform float u_noise;
uniform float u_noiseFrequency;

${sizingHelpers}
${simplexNoise}

vec4 main(vec2 fragCoord) {
  vec2 fc = fragCoord * u_pixelRatio;

  vec2 v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize;
  paperComputeUVs(fc, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_objectUV;

  float l = length(shape_uv);
  l = max(1e-4, l);

  float t = u_time;

  float angle = ceil(u_bandCount) * atan(shape_uv.y, shape_uv.x) + t;
  float angle_norm = angle / TWO_PI;

  float twist = 3. * clamp(u_twist, 0., 1.);
  float offset = pow(l, -twist) + angle_norm;

  float shape = fract(offset);
  shape = 1. - abs(2. * shape - 1.);
  shape += u_noise * snoise(15. * pow(u_noiseFrequency, 2.) * shape_uv);

  float mid = smoothstep(.2, .2 + .8 * u_center, pow(l, twist));
  shape = mix(0., shape, mid);

  float proportion = clamp(u_proportion, 0., 1.);
  float exponent = mix(.25, 1., proportion * 2.);
  exponent = mix(exponent, 10., max(0., proportion * 2. - 1.));
  shape = pow(shape, exponent);

  float mixer = shape * u_colorsCount;
  vec4 gradient = pickColor(0);
  gradient.rgb *= gradient.a;

  float outerShape = 0.;
  for (int i = 1; i < ${SWIRL_MAX_COLORS + 1}; i++) {
    if (i > int(u_colorsCount)) break;

    float m = clamp(mixer - float(i - 1), 0., 1.);
    float aa = 0.001;
    m = smoothstep(.5 - .5 * u_softness - aa, .5 + .5 * u_softness + aa, m);

    if (i == 1) {
      outerShape = m;
    }

    vec4 c = pickColor(i - 1);
    c.rgb *= c.a;
    gradient = mix(gradient, c, m);
  }

  float midAA = .1 * 0.001;
  float outerMid = smoothstep(.2, .2 + midAA, pow(l, twist));
  outerShape = mix(0., outerShape, outerMid);

  vec3 color = gradient.rgb * outerShape;
  float opacity = gradient.a * outerShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  color += 1. / 256. * (fract(sin(dot(.014 * fc, vec2(12.9898, 78.233))) * 43758.5453123) - .5);

  return vec4(color, opacity);
}
`;
