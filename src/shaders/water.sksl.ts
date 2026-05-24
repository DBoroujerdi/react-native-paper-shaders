// SkSL port of @paper-design/shaders' Water fragment shader.
// Source: packages/shaders/src/shaders/water.ts
//
// Paper's Water composites a caustic distortion over a sampled u_image texture; this port
// drops image sampling (Skia runtime effects in this gallery don't take a texture) and
// renders the caustic highlights over u_colorBack only. The result is still recognizable
// as the streaming/abstract/slow-mo caustic look, just without an underlying photo.

import { declarePI, rotation2, simplexNoise, sizingHelpers } from "./shader-utils.sksl";

export const WATER_SKSL = `
${declarePI}
${rotation2}
${simplexNoise}

uniform float u_time;

uniform vec4  u_colorBack;
uniform vec4  u_colorHighlight;

uniform float u_size;
uniform float u_highlights;
uniform float u_layering;
uniform float u_edges;
uniform float u_caustic;
uniform float u_waves;

${sizingHelpers}

mat2 rotate2D(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

float getCausticNoise(vec2 uv, float t, float scale) {
  vec2 n = vec2(.1);
  vec2 N = vec2(.1);
  mat2 m = rotate2D(.5);
  for (int j = 0; j < 6; j++) {
    uv *= m;
    n *= m;
    vec2 q = uv * scale + float(j) + n + (.5 + .5 * float(j)) * (mod(float(j), 2.) - 1.) * t;
    n += sin(q);
    N += cos(q) / scale;
    scale *= 1.1;
  }
  return (N.x + N.y + 1.);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 objectUV, patternUV_unused, responsiveUV, responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, objectUV, patternUV_unused, responsiveUV, responsiveBoxGivenSize);

  // Paper's v_imageUV is similar to objectUV but offset to 0..1; we approximate.
  vec2 imageUV = objectUV + 0.5;
  vec2 patternUV = imageUV - .5;
  patternUV /= (.01 + .09 * u_size);

  float t = u_time;

  float wavesNoise = snoise((.3 + .1 * sin(t)) * .1 * patternUV + vec2(0., .4 * t));

  float causticNoise = getCausticNoise(patternUV + u_waves * vec2(1., -1.) * wavesNoise, 2. * t, 1.5);
  causticNoise += u_layering * getCausticNoise(patternUV + 2. * u_waves * vec2(1., -1.) * wavesNoise, 1.5 * t, 2.);
  causticNoise = causticNoise * causticNoise;

  // No image sampling — composite over background.
  vec4 backColor = u_colorBack;
  backColor.rgb *= backColor.a;
  vec3 color = backColor.rgb;
  float opacity = backColor.a;

  causticNoise = max(-.2, causticNoise);

  float hightlight = .025 * u_highlights * causticNoise;
  hightlight *= u_colorHighlight.a;
  color = mix(color, u_colorHighlight.rgb, .05 * u_highlights * causticNoise);
  opacity += hightlight;

  color += hightlight * (.5 + .5 * wavesNoise);
  opacity += hightlight * (.5 + .5 * wavesNoise);

  opacity = clamp(opacity, 0., 1.);

  return vec4(color, opacity);
}
`;
