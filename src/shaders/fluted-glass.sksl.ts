// SkSL port of @paper-design/shaders' FlutedGlass fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/fluted-glass.ts
//
// Differences from the GLSL ES 300 original:
//   - No #version / precision / in/out declarations.
//   - Entry point is `vec4 main(vec2 fragCoord)`; first line scales to device pixels.
//   - v_imageUV is computed inline from fragCoord (Paper does this in a vertex shader).
//   - PLACEHOLDER: u_image is stubbed with a vivid procedural background
//     (horizontal hue stripes + a soft radial gradient) so the fluted refraction
//     is visible without a bound texture. The Gaussian blur is dropped in the
//     stub path (cheap procedural source - blurring it adds nothing) but the
//     SkSL is structured so swapping in a real image-shader sample plus the
//     existing `getBlur` machinery is a one-line change.
//   - `switch` over u_distortionShape replaced with if/else.
//   - Procedural hash21 / valueNoise included locally instead of via texture.

import { declarePI, proceduralHash21 } from "./shader-utils.sksl";

export const FLUTED_GLASS_SKSL = `
${declarePI}
${proceduralHash21}

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

uniform vec4  u_colorBack;
uniform vec4  u_colorShadow;
uniform vec4  u_colorHighlight;

uniform float u_size;
uniform float u_shadows;
uniform float u_angle;
uniform float u_stretch;
uniform float u_shape;
uniform float u_distortion;
uniform float u_highlights;
uniform float u_distortionShape;
uniform float u_shift;
uniform float u_blur;
uniform float u_edges;
uniform float u_marginLeft;
uniform float u_marginRight;
uniform float u_marginTop;
uniform float u_marginBottom;
uniform float u_grainMixer;
uniform float u_grainOverlay;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float getUvFrame(vec2 uv, float softness) {
  float aax = 2.0 * 0.001;
  float aay = 2.0 * 0.001;
  float left   = smoothstep(0.0, aax + softness, uv.x);
  float right  = 1.0 - smoothstep(1.0 - softness - aax, 1.0, uv.x);
  float bottom = smoothstep(0.0, aay + softness, uv.y);
  float top    = 1.0 - smoothstep(1.0 - softness - aay, 1.0, uv.y);
  return left * right * bottom * top;
}

vec2 rotateAspect(vec2 p, float a, float aspect) {
  p.x *= aspect;
  p = rotate(p, a);
  p.x /= aspect;
  return p;
}

float smoothFract(float x) {
  float f = fract(x);
  float w = 0.001;
  float edge = abs(f - 0.5) - 0.5;
  float band = smoothstep(-w, w, edge);
  return mix(f, 1.0 - f, band);
}

// Stub for the absent source image: a soft horizontal hue gradient with a
// radial vignette. Distinct, mid-bright colors so the fluted distortion is
// easy to read. Swap for a real sample(u_image, uv) when a shader is bound.
vec4 sampleStubImage(vec2 uv) {
  // Clamp UV to image bounds so distortion outside the [0,1] frame still
  // returns a defined color (matches texture()'s clamp-to-edge behaviour).
  vec2 q = clamp(uv, 0.0, 1.0);
  vec3 a = vec3(0.95, 0.35, 0.55); // warm pink
  vec3 b = vec3(0.30, 0.65, 1.00); // sky blue
  vec3 c = vec3(0.20, 0.85, 0.65); // teal
  float t = q.x;
  vec3 col = mix(a, b, smoothstep(0.0, 0.55, t));
  col = mix(col, c, smoothstep(0.45, 1.0, t));
  // Subtle vertical shading to give the distortion something to grab onto.
  col *= mix(0.75, 1.1, q.y);
  return vec4(col, 1.0);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  // Inline v_imageUV computation (Paper does this in the vertex shader).
  float imageAspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 ndc = (fragCoord / u_resolution - 0.5);
  vec2 boxOrigin = vec2(0.5 - u_originX, u_originY - 0.5);
  float r = u_rotation * PI / 180.0;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 imageBoxSize;
  if (u_fit == 1.0) {
    imageBoxSize.x = min(u_resolution.x / imageAspect, u_resolution.y) * imageAspect;
  } else if (u_fit == 2.0) {
    imageBoxSize.x = max(u_resolution.x / imageAspect, u_resolution.y) * imageAspect;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / imageAspect * imageAspect);
  }
  imageBoxSize.y = imageBoxSize.x / imageAspect;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  vec2 v_imageUV = ndc;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.0);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= imageAspect;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= imageAspect;
  v_imageUV += 0.5;
  v_imageUV.y = 1.0 - v_imageUV.y;

  float patternRotation = -u_angle * PI / 180.0;
  float patternSize = mix(200.0, 5.0, u_size);

  vec2 uv = v_imageUV;

  vec2 uvMask = fragCoord / u_resolution.xy;
  vec2 sw = vec2(0.005);
  vec4 margins = vec4(u_marginLeft, u_marginTop, u_marginRight, u_marginBottom);
  float mask =
    smoothstep(margins[0], margins[0] + sw.x, uvMask.x + sw.x) *
    smoothstep(margins[2], margins[2] + sw.x, 1.0 - uvMask.x + sw.x) *
    smoothstep(margins[1], margins[1] + sw.y, uvMask.y + sw.y) *
    smoothstep(margins[3], margins[3] + sw.y, 1.0 - uvMask.y + sw.y);
  float maskOuter =
    smoothstep(margins[0] - sw.x, margins[0], uvMask.x + sw.x) *
    smoothstep(margins[2] - sw.x, margins[2], 1.0 - uvMask.x + sw.x) *
    smoothstep(margins[1] - sw.y, margins[1], uvMask.y + sw.y) *
    smoothstep(margins[3] - sw.y, margins[3], 1.0 - uvMask.y + sw.y);
  float maskStroke = maskOuter - mask;
  float maskInner =
    smoothstep(margins[0] - 2.0 * sw.x, margins[0], uvMask.x) *
    smoothstep(margins[2] - 2.0 * sw.x, margins[2], 1.0 - uvMask.x) *
    smoothstep(margins[1] - 2.0 * sw.y, margins[1], uvMask.y) *
    smoothstep(margins[3] - 2.0 * sw.y, margins[3], 1.0 - uvMask.y);
  float maskStrokeInner = maskInner - mask;

  uv -= 0.5;
  uv *= patternSize;
  uv = rotateAspect(uv, patternRotation, imageAspect);

  float curve = 0.0;
  float patternY = uv.y / imageAspect;
  if (u_shape > 4.5) {
    curve = 0.5 + 0.5 * sin(0.5 * PI * uv.x) * cos(0.5 * PI * patternY);
  } else if (u_shape > 3.5) {
    curve = 10.0 * abs(fract(0.1 * patternY) - 0.5);
  } else if (u_shape > 2.5) {
    curve = 4.0 * sin(0.23 * patternY);
  } else if (u_shape > 1.5) {
    curve = 0.5 + 0.5 * sin(0.5 * uv.x) * sin(1.7 * uv.x);
  }
  // else: shape == lines, curve stays 0.

  vec2 UvToFract = uv + curve;
  vec2 fractOrigUV = fract(uv);
  vec2 floorOrigUV = floor(uv);

  float x = smoothFract(UvToFract.x);
  float xNonSmooth = fract(UvToFract.x) + 0.0001;

  float highlightsWidth = 2.0 * max(0.001, 0.001);
  highlightsWidth += 2.0 * maskStrokeInner;
  float highlights = smoothstep(0.0, highlightsWidth, xNonSmooth);
  highlights *= smoothstep(1.0, 1.0 - highlightsWidth, xNonSmooth);
  highlights = 1.0 - highlights;
  highlights *= u_highlights;
  highlights = clamp(highlights, 0.0, 1.0);
  highlights *= mask;

  float shadows = pow(x, 1.3);
  float distortion = 0.0;
  float fadeX = 1.0;
  float frameFade = 0.0;

  float aa = 0.001;
  aa = max(aa, 0.001);
  aa = max(aa, 0.001);
  aa = max(aa, 0.0001);

  if (u_distortionShape == 1.0) {
    distortion = -pow(1.5 * x, 3.0);
    distortion += (0.5 - u_shift);
    frameFade = pow(1.5 * x, 3.0);
    aa = max(0.2, aa);
    aa += mix(0.2, 0.0, u_size);
    fadeX = smoothstep(0.0, aa, xNonSmooth) * smoothstep(1.0, 1.0 - aa, xNonSmooth);
    distortion = mix(0.5, distortion, fadeX);
  } else if (u_distortionShape == 2.0) {
    distortion = 2.0 * pow(x, 2.0);
    distortion -= (0.5 + u_shift);
    frameFade = pow(abs(x - 0.5), 4.0);
    aa = max(0.2, aa);
    aa += mix(0.2, 0.0, u_size);
    fadeX = smoothstep(0.0, aa, xNonSmooth) * smoothstep(1.0, 1.0 - aa, xNonSmooth);
    distortion = mix(0.5, distortion, fadeX);
    frameFade = mix(1.0, frameFade, 0.5 * fadeX);
  } else if (u_distortionShape == 3.0) {
    distortion = pow(2.0 * (xNonSmooth - 0.5), 6.0);
    distortion -= 0.25;
    distortion -= u_shift;
    frameFade = 1.0 - 2.0 * pow(abs(x - 0.4), 2.0);
    aa = 0.15;
    aa += mix(0.1, 0.0, u_size);
    fadeX = smoothstep(0.0, aa, xNonSmooth) * smoothstep(1.0, 1.0 - aa, xNonSmooth);
    frameFade = mix(1.0, frameFade, fadeX);
  } else if (u_distortionShape == 4.0) {
    x = xNonSmooth;
    distortion = sin((x + 0.25) * TWO_PI);
    shadows = 0.5 + 0.5 * asin(distortion) / (0.5 * PI);
    distortion *= 0.5;
    distortion -= u_shift;
    frameFade = 0.5 + 0.5 * sin(x * TWO_PI);
  } else if (u_distortionShape == 5.0) {
    distortion -= pow(abs(x), 0.2) * x;
    distortion += 0.33;
    distortion -= 3.0 * u_shift;
    distortion *= 0.33;
    frameFade = 0.3 * (smoothstep(0.0, 1.0, x));
    shadows = pow(x, 2.5);
    aa = max(0.1, aa);
    aa += mix(0.1, 0.0, u_size);
    fadeX = smoothstep(0.0, aa, xNonSmooth) * smoothstep(1.0, 1.0 - aa, xNonSmooth);
    distortion *= fadeX;
  }

  // SkSL runtime effects don't expose dFdx/dFdy; approximate per-pixel derivative magnitude
  // from u_resolution + u_pixelRatio so grain scales roughly the same on retina vs non-retina.
  float pixelStep = u_pixelRatio / max(1.0, max(u_resolution.x, u_resolution.y));
  vec2 grainUV = v_imageUV - 0.5;
  grainUV *= (0.8 / vec2(max(pixelStep, 1e-6), max(pixelStep, 1e-6)));
  grainUV += 0.5;
  float grain = valueNoise(grainUV);
  grain = smoothstep(0.4, 0.7, grain);
  grain *= u_grainMixer;
  distortion = mix(distortion, 0.0, grain);

  shadows = min(shadows, 1.0);
  shadows += maskStrokeInner;
  shadows *= mask;
  shadows = min(shadows, 1.0);
  shadows *= pow(u_shadows, 2.0);
  shadows = clamp(shadows, 0.0, 1.0);

  distortion *= 3.0 * u_distortion;
  frameFade *= u_distortion;

  fractOrigUV.x += distortion;
  floorOrigUV = rotateAspect(floorOrigUV, -patternRotation, imageAspect);
  fractOrigUV = rotateAspect(fractOrigUV, -patternRotation, imageAspect);

  uv = (floorOrigUV + fractOrigUV) / patternSize;
  uv += pow(maskStroke, 4.0);
  uv += vec2(0.5);

  uv = mix(v_imageUV, uv, smoothstep(0.0, 0.7, mask));

  float edgeDistortion = mix(0.0, 0.04, u_edges);
  edgeDistortion += 0.06 * frameFade * u_edges;
  edgeDistortion *= mask;
  float frame = getUvFrame(uv, edgeDistortion);

  float stretch = 1.0 - smoothstep(0.0, 0.5, xNonSmooth) * smoothstep(1.0, 0.5, xNonSmooth);
  stretch = pow(stretch, 2.0);
  stretch *= mask;
  stretch *= getUvFrame(uv, 0.1 + 0.05 * mask * frameFade);
  uv.y = mix(uv.y, 0.5, u_stretch * stretch);

  // No real image; sample the procedural stub. Premultiply for the same
  // composite math Paper uses.
  vec4 image = sampleStubImage(uv);
  image.rgb *= image.a;

  vec4 backColor = u_colorBack;
  backColor.rgb *= backColor.a;
  vec4 highlightColor = u_colorHighlight;
  highlightColor.rgb *= highlightColor.a;
  vec4 shadowColor = u_colorShadow;

  vec3 color = highlightColor.rgb * highlights;
  float opacity = highlightColor.a * highlights;

  shadows = mix(shadows * shadowColor.a, 0.0, highlights);
  color = mix(color, shadowColor.rgb * shadowColor.a, 0.5 * shadows);
  color += 0.5 * pow(shadows, 0.5) * shadowColor.rgb;
  opacity += shadows;
  color = clamp(color, vec3(0.0), vec3(1.0));
  opacity = clamp(opacity, 0.0, 1.0);

  color += image.rgb * (1.0 - opacity) * frame;
  opacity += image.a * (1.0 - opacity) * frame;

  color += backColor.rgb * (1.0 - opacity);
  opacity += backColor.a * (1.0 - opacity);

  float grainOverlay = valueNoise(rotate(grainUV, 1.0) + vec2(3.0));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.0) + vec2(-1.0)), 0.5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2.0 - 1.0;
  vec3 grainOverlayColor = vec3(step(0.0, grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, 0.8);
  grainOverlayStrength *= mask;
  color = mix(color, grainOverlayColor, 0.35 * grainOverlayStrength);

  opacity += 0.5 * grainOverlayStrength;
  opacity = clamp(opacity, 0.0, 1.0);

  return vec4(color, opacity);
}
`;
