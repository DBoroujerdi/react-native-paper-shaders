// SkSL port of @paper-design/shaders' color-panels fragment shader.
// Source: packages/shaders/src/shaders/color-panels.ts (maxColorCount = 7)
//
// Notes:
//   - The vertex-stage v_objectUV is rebuilt with paperComputeUVs.
//   - The vec4 u_colors[7] array is unrolled into u_color0..u_color6 uniforms; a single
//     premultipliedColor(int) function returns the premultiplied form for index 0..6.
//   - Paper uses a local `vec4 premultipliedColors[N]` populated in a loop, which SkSL
//     does not support (arrays of structs/vectors with non-constant indices aren't allowed
//     here). We sidestep by recomputing premultipliedColor() each access — cheap, since
//     it's seven branches max.
//   - `i % colorsCount` is preserved (SkSL allows `%` on int operands).

import {
  declarePI,
  sizingHelpers,
} from "./shader-utils.sksl";

export const COLOR_PANELS_SKSL = `
${declarePI}

uniform float u_time;

uniform vec4 u_color0;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform vec4 u_color4;
uniform vec4 u_color5;
uniform vec4 u_color6;
uniform float u_colorsCount;
uniform vec4 u_colorBack;
uniform float u_density;
uniform float u_angle1;
uniform float u_angle2;
uniform float u_length;
uniform float u_edges;
uniform float u_blur;
uniform float u_fadeIn;
uniform float u_fadeOut;
uniform float u_gradient;

${sizingHelpers}

vec4 pickColorRaw(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  if (i == 4) return u_color4;
  if (i == 5) return u_color5;
  return u_color6;
}

vec4 premultipliedColor(int i) {
  vec4 c = pickColorRaw(i);
  c.rgb *= c.a;
  return c;
}

const float zLimit = .5;

vec2 getPanel(float angle, vec2 uv, float invLength, float aa) {
  float sinA = sin(angle);
  float cosA = cos(angle);

  float denom = sinA - uv.y * cosA;
  if (abs(denom) < .01) return vec2(0.);

  float z = uv.y / denom;
  if (z <= 0. || z > zLimit) return vec2(0.);

  float zRatio = z / zLimit;
  float panelMap = 1. - zRatio;
  float x = uv.x * (cosA * z + 1.) * invLength;

  float zOffset = zRatio - .5;
  float left = -.5 + zOffset * u_angle1;
  float right = .5 - zOffset * u_angle2;
  float blurX = aa + 2. * panelMap * u_blur;

  float leftEdge1 = left - blurX;
  float leftEdge2 = left + .25 * blurX;
  float rightEdge1 = right - .25 * blurX;
  float rightEdge2 = right + blurX;

  float panel = smoothstep(leftEdge1, leftEdge2, x) * (1.0 - smoothstep(rightEdge1, rightEdge2, x));
  panel *= mix(0., panel, smoothstep(0., .01 / max(u_scale, 1e-6), panelMap));

  float midScreen = abs(sinA);
  if (u_edges > 0.5) {
    panelMap = mix(.99, panelMap, panel * clamp(panelMap / (.15 * (1. - pow(midScreen, .1))), 0.0, 1.0));
  } else if (midScreen < .07) {
    panel *= (midScreen * 15.);
  }

  return vec2(panel, panelMap);
}

vec4 blendColor(vec4 colorA, float panelMask, float panelMap) {
  float fade = 1. - smoothstep(.97 - .97 * u_fadeIn, 1., panelMap);
  fade *= smoothstep(-.2 * (1. - u_fadeOut), u_fadeOut, panelMap);

  vec3 blendedRGB = mix(vec3(0.), colorA.rgb, fade);
  float blendedAlpha = mix(0., colorA.a, fade);

  return vec4(blendedRGB, blendedAlpha) * panelMask;
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV;
  vec2 v_patternUV;
  vec2 v_responsiveUV;
  vec2 v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 uv = v_objectUV * 1.25;

  float t = .02 * u_time;
  t = fract(t);
  bool reverseTime = (t < 0.5);

  vec3 color = vec3(0.);
  float opacity = 0.;

  float aa = .005 / u_scale;
  int colorsCount = int(u_colorsCount);

  float invLength = 1.5 / max(u_length, .001);

  int panelsNumber = 12;
  float densityNormalizer = 1.;
  if (colorsCount == 4) {
    panelsNumber = 16;
    densityNormalizer = 1.34;
  } else if (colorsCount == 5) {
    panelsNumber = 20;
    densityNormalizer = 1.67;
  } else if (colorsCount == 7) {
    panelsNumber = 14;
    densityNormalizer = 1.17;
  }

  float fPanelsNumber = float(panelsNumber);
  float panelGrad = 1. - clamp(u_gradient, 0., 1.);

  for (int setIdx = 0; setIdx < 2; setIdx += 1) {
    bool isForward = (setIdx == 0 && !reverseTime) || (setIdx == 1 && reverseTime);
    if (!isForward) continue;

    for (int i = 0; i <= 20; i += 1) {
      if (i >= panelsNumber) break;

      int idx = panelsNumber - 1 - i;

      float offset = float(idx) / fPanelsNumber;
      if (setIdx == 1) {
        offset += .5;
      }

      float densityFract = densityNormalizer * fract(t + offset);
      float angleNorm = densityFract / u_density;
      if (densityFract >= .5 || angleNorm >= .3) continue;

      float smoothDensity = clamp((.5 - densityFract) / .1, 0., 1.) * clamp(densityFract / .01, 0., 1.);
      float smoothAngle = clamp((.3 - angleNorm) / .05, 0., 1.);
      if (smoothDensity * smoothAngle < .001) continue;

      if (angleNorm > .5) {
        angleNorm = 0.5;
      }
      vec2 panel = getPanel(angleNorm * TWO_PI + PI, uv, invLength, aa);
      if (panel.x <= .001) continue;
      float panelMask = panel.x * smoothDensity * smoothAngle;
      float panelMap = panel.y;

      int colorIdx = idx - (idx / colorsCount) * colorsCount;
      int nextColorIdx = colorIdx + 1;
      if (nextColorIdx >= colorsCount) nextColorIdx -= colorsCount;

      vec4 colorA = premultipliedColor(colorIdx);
      vec4 colorB = premultipliedColor(nextColorIdx);

      colorA = mix(colorA, colorB, max(0., smoothstep(.0, .45, panelMap) - panelGrad));
      vec4 blended = blendColor(colorA, panelMask, panelMap);
      color = blended.rgb + color * (1. - blended.a);
      opacity = blended.a + opacity * (1. - blended.a);
    }

    for (int i = 0; i <= 20; i += 1) {
      if (i >= panelsNumber) break;

      int idx = panelsNumber - 1 - i;

      float offset = float(idx) / fPanelsNumber;
      if (setIdx == 0) {
        offset += .5;
      }

      float densityFract = densityNormalizer * fract(-t + offset);
      float angleNorm = -densityFract / u_density;
      if (densityFract >= .5 || angleNorm < -.3) continue;

      float smoothDensity = clamp((.5 - densityFract) / .1, 0., 1.) * clamp(densityFract / .01, 0., 1.);
      float smoothAngle = clamp((angleNorm + .3) / .05, 0., 1.);
      if (smoothDensity * smoothAngle < .001) continue;

      vec2 panel = getPanel(angleNorm * TWO_PI + PI, uv, invLength, aa);
      float panelMask = panel.x * smoothDensity * smoothAngle;
      if (panelMask <= .001) continue;
      float panelMap = panel.y;

      int idxMod = idx - (idx / colorsCount) * colorsCount;
      int colorIdx = (colorsCount - idxMod);
      if (colorIdx >= colorsCount) colorIdx -= colorsCount;
      if (colorIdx < 0) colorIdx += colorsCount;
      int nextColorIdx = colorIdx + 1;
      if (nextColorIdx >= colorsCount) nextColorIdx -= colorsCount;

      vec4 colorA = premultipliedColor(colorIdx);
      vec4 colorB = premultipliedColor(nextColorIdx);

      colorA = mix(colorA, colorB, max(0., smoothstep(.0, .45, panelMap) - panelGrad));
      vec4 blended = blendColor(colorA, panelMask, panelMap);
      color = blended.rgb + color * (1. - blended.a);
      opacity = blended.a + opacity * (1. - blended.a);
    }
  }

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  return vec4(color, opacity);
}
`;
