// SkSL port of @paper-design/shaders' Neuro Noise fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/neuro-noise.ts
//
// Notes on the port:
//   - v_patternUV is computed inline via paperComputeUVs.
//   - Uses Paper's rotate() helper. No texture sampling required.
//   - colorBandingFix is dropped (it referenced gl_FragCoord).

import { rotation2, sizingHelpers } from "./shader-utils.sksl";

export const NEURO_NOISE_SKSL = `
${rotation2}
${sizingHelpers}

uniform float u_time;

uniform vec4  u_colorFront;
uniform vec4  u_colorMid;
uniform vec4  u_colorBack;
uniform float u_brightness;
uniform float u_contrast;

float neuroShape(vec2 uv, float t) {
  vec2 sine_acc = vec2(0.);
  vec2 res = vec2(0.);
  float scale = 8.;
  for (int j = 0; j < 15; j++) {
    uv = rotate(uv, 1.);
    sine_acc = rotate(sine_acc, 1.);
    vec2 layer = uv * scale + float(j) + sine_acc - t;
    sine_acc += sin(layer);
    res += (.5 + .5 * cos(layer)) / scale;
    scale *= (1.2);
  }
  return res.x + res.y;
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV;
  vec2 v_patternUV;
  vec2 v_responsiveUV;
  vec2 v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_patternUV;
  shape_uv *= .13;

  float t = .5 * u_time;
  float noise = neuroShape(shape_uv, t);

  noise = (1. + u_brightness) * noise * noise;
  noise = pow(noise, .7 + 6. * u_contrast);
  noise = min(1.4, noise);

  float blend = smoothstep(0.7, 1.4, noise);

  vec4 frontC = u_colorFront;
  frontC.rgb *= frontC.a;
  vec4 midC = u_colorMid;
  midC.rgb *= midC.a;
  vec4 blendFront = mix(midC, frontC, blend);

  float safeNoise = max(noise, 0.0);
  vec3 color = blendFront.rgb * safeNoise;
  float opacity = clamp(blendFront.a * safeNoise, 0., 1.);

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  return vec4(color, opacity);
}
`;
