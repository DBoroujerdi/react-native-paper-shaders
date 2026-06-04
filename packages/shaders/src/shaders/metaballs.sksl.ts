// SkSL port of @paper-design/shaders' Metaballs fragment shader.
// Source: packages/shaders/src/shaders/metaballs.ts
//
// Notes:
//   - Original uses textureRandomizerR to drive 1D motion noise. We substitute
//     with hash11 over floor(p.x), which gives the same statistical behavior.
//   - The original "colorBandingFix" uses gl_FragCoord; we replicate it with
//     SkSL fragCoord captured at the top of main().
//   - u_colors is a uniform vec4 array of size 8; SkSL supports this directly.

import {
  declarePI,
  proceduralHash11,
  sizingHelpers,
} from "./shader-utils.sksl";

export const METABALLS_MAX_COLORS = 8;
export const METABALLS_MAX_BALLS = 20;

export const METABALLS_SKSL = `
${declarePI}
${proceduralHash11}

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

vec4 pickColor(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  if (i == 4) return u_color4;
  if (i == 5) return u_color5;
  if (i == 6) return u_color6;
  return u_color7;
}
uniform float u_colorsCount;
uniform float u_size;
uniform float u_count;

${sizingHelpers}

// 1D procedural value-noise driver. Paper's GLSL uses a texture lookup,
// but the math reduces to mixing two hash samples of floor(x) and floor(x)+1.
float randomR1(float x) {
  return hash11(floor(x) + 0.5);
}
float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(randomR1(i), randomR1(i + 1.0), u);
}

float getBallShape(vec2 uv, vec2 c, float p) {
  float s = .5 * length(uv - c);
  s = 1. - clamp(s, 0., 1.);
  s = pow(s, p);
  return s;
}

vec4 main(vec2 fragCoord) {
  vec2 fc = fragCoord * u_pixelRatio;

  vec2 v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize;
  paperComputeUVs(fc, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_objectUV;
  shape_uv += .5;

  const float firstFrameOffset = 2503.4;
  float t = .2 * (u_time + firstFrameOffset);

  vec3 totalColor = vec3(0.);
  float totalShape = 0.;
  float totalOpacity = 0.;

  for (int i = 0; i < ${METABALLS_MAX_BALLS}; i++) {
    if (i >= int(ceil(u_count))) break;

    float idxFract = float(i) / float(${METABALLS_MAX_BALLS});
    float angle = TWO_PI * idxFract;

    float speed = 1. - .2 * idxFract;
    float noiseX = noise1(angle * 10. + float(i) + t * speed);
    float noiseY = noise1(angle * 20. + float(i) - t * speed);

    vec2 pos = vec2(.5) + 1e-4 + .9 * (vec2(noiseX, noiseY) - .5);

    int cc = int(u_colorsCount + 0.5);
    int safeIndex = i - (i / cc) * cc;
    vec4 ballColor = pickColor(safeIndex);
    ballColor.rgb *= ballColor.a;

    float sizeFrac = 1.;
    if (float(i) > floor(u_count - 1.)) {
      sizeFrac *= fract(u_count);
    }

    float shape = getBallShape(shape_uv, pos, 45. - 30. * u_size * sizeFrac);
    shape *= pow(u_size, .2);
    shape = smoothstep(0., 1., shape);

    totalColor += ballColor.rgb * shape;
    totalShape += shape;
    totalOpacity += ballColor.a * shape;
  }

  totalColor /= max(totalShape, 1e-4);
  totalOpacity /= max(totalShape, 1e-4);

  float edge_width = 0.001;
  float finalShape = smoothstep(.4, .4 + edge_width, totalShape);

  vec3 color = totalColor * finalShape;
  float opacity = totalOpacity * finalShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  // Paper's colorBandingFix, but using SkSL fragCoord.
  color += 1. / 256. * (fract(sin(dot(.014 * fc, vec2(12.9898, 78.233))) * 43758.5453123) - .5);

  return vec4(color, opacity);
}
`;
