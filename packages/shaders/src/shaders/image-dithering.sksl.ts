// SkSL port of @paper-design/shaders' ImageDithering fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/image-dithering.ts
//
// Differences from the GLSL ES 300 original:
//   - No #version / precision / in/out declarations.
//   - Entry point is `vec4 main(vec2 fragCoord)`; first line scales to device pixels.
//   - The Bayer matrix arrays are encoded as chained-if lookups (SkSL has no
//     array initializers).
//   - The `switch` statement is rewritten as an if/else chain.
//   - PLACEHOLDER: u_image is stubbed with a procedural vertical gradient
//     (white at the top, fading to black at the bottom), so the dithering is
//     visible without a bound texture. Replace `sampleStubImage` once Skia
//     image-shader support is wired into the gallery.

import { declarePI, proceduralHash21 } from "./shader-utils.sksl";

export const IMAGE_DITHERING_SKSL = `
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

uniform vec4  u_colorFront;
uniform vec4  u_colorBack;
uniform vec4  u_colorHighlight;

uniform float u_type;
uniform float u_pxSize;
uniform float u_originalColors;
uniform float u_inverted;
uniform float u_colorSteps;

// Stub for the absent source image. A vertical gradient gives the dithering
// algorithm a smooth luminance ramp to threshold, which is the most visually
// recognisable placeholder; once a real image shader is wired into Skia this
// should be replaced with a sample(u_image, uv) call.
vec4 sampleStubImage(vec2 uv) {
  // Diagonal gradient with a soft radial vignette so all dither patterns show.
  float diag = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
  vec2 c = uv - 0.5;
  float vignette = 1.0 - smoothstep(0.4, 0.8, length(c));
  float lum = mix(0.15, 1.0, diag) * (0.55 + 0.45 * vignette);
  return vec4(vec3(lum), 1.0);
}

float bayer2(int idx) {
  if (idx == 0) return 0.0;
  if (idx == 1) return 2.0;
  if (idx == 2) return 3.0;
  return 1.0;
}

float bayer4(int idx) {
  if (idx ==  0) return  0.0; if (idx ==  1) return  8.0; if (idx ==  2) return  2.0; if (idx ==  3) return 10.0;
  if (idx ==  4) return 12.0; if (idx ==  5) return  4.0; if (idx ==  6) return 14.0; if (idx ==  7) return  6.0;
  if (idx ==  8) return  3.0; if (idx ==  9) return 11.0; if (idx == 10) return  1.0; if (idx == 11) return  9.0;
  if (idx == 12) return 15.0; if (idx == 13) return  7.0; if (idx == 14) return 13.0;
  return 5.0;
}

float bayer8(int idx) {
  if (idx ==  0) return  0.0; if (idx ==  1) return 32.0; if (idx ==  2) return  8.0; if (idx ==  3) return 40.0;
  if (idx ==  4) return  2.0; if (idx ==  5) return 34.0; if (idx ==  6) return 10.0; if (idx ==  7) return 42.0;
  if (idx ==  8) return 48.0; if (idx ==  9) return 16.0; if (idx == 10) return 56.0; if (idx == 11) return 24.0;
  if (idx == 12) return 50.0; if (idx == 13) return 18.0; if (idx == 14) return 58.0; if (idx == 15) return 26.0;
  if (idx == 16) return 12.0; if (idx == 17) return 44.0; if (idx == 18) return  4.0; if (idx == 19) return 36.0;
  if (idx == 20) return 14.0; if (idx == 21) return 46.0; if (idx == 22) return  6.0; if (idx == 23) return 38.0;
  if (idx == 24) return 60.0; if (idx == 25) return 28.0; if (idx == 26) return 52.0; if (idx == 27) return 20.0;
  if (idx == 28) return 62.0; if (idx == 29) return 30.0; if (idx == 30) return 54.0; if (idx == 31) return 22.0;
  if (idx == 32) return  3.0; if (idx == 33) return 35.0; if (idx == 34) return 11.0; if (idx == 35) return 43.0;
  if (idx == 36) return  1.0; if (idx == 37) return 33.0; if (idx == 38) return  9.0; if (idx == 39) return 41.0;
  if (idx == 40) return 51.0; if (idx == 41) return 19.0; if (idx == 42) return 59.0; if (idx == 43) return 27.0;
  if (idx == 44) return 49.0; if (idx == 45) return 17.0; if (idx == 46) return 57.0; if (idx == 47) return 25.0;
  if (idx == 48) return 15.0; if (idx == 49) return 47.0; if (idx == 50) return  7.0; if (idx == 51) return 39.0;
  if (idx == 52) return 13.0; if (idx == 53) return 45.0; if (idx == 54) return  5.0; if (idx == 55) return 37.0;
  if (idx == 56) return 63.0; if (idx == 57) return 31.0; if (idx == 58) return 55.0; if (idx == 59) return 23.0;
  if (idx == 60) return 61.0; if (idx == 61) return 29.0; if (idx == 62) return 53.0;
  return 21.0;
}

float getBayerValue(vec2 uv, int size) {
  int2 pos = int2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;
  if (size == 2) return bayer2(index) / 4.0;
  if (size == 4) return bayer4(index) / 16.0;
  if (size == 8) return bayer8(index) / 64.0;
  return 0.0;
}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;
  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);
  return left * right * bottom * top;
}

vec2 getImageUV(vec2 uv) {
  float imageAspect = 1.0;
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

  vec2 imageUV = uv;
  imageUV *= imageBoxScale;
  imageUV += boxOrigin * (imageBoxScale - 1.0);
  imageUV += graphicOffset;
  imageUV /= u_scale;
  imageUV.x *= imageAspect;
  imageUV = graphicRotation * imageUV;
  imageUV.x /= imageAspect;

  imageUV += 0.5;
  imageUV.y = 1.0 - imageUV.y;
  return imageUV;
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = fragCoord - 0.5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + 0.5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 imageUV = getImageUV(normalizedUV);
  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec4 image = sampleStubImage(imageUV);
  float frame = getUvFrame(imageUV, pxSize / u_resolution);

  int type = int(floor(u_type));
  float dithering = 0.0;

  float lum = dot(vec3(0.2126, 0.7152, 0.0722), image.rgb);
  lum = (u_inverted > 0.5) ? (1.0 - lum) : lum;

  if (type == 1) {
    dithering = step(hash21(ditheringNoiseUV), lum);
  } else if (type == 2) {
    dithering = getBayerValue(pxSizeUV, 2);
  } else if (type == 3) {
    dithering = getBayerValue(pxSizeUV, 4);
  } else {
    dithering = getBayerValue(pxSizeUV, 8);
  }

  float colorSteps = max(floor(u_colorSteps), 1.0);
  vec3 color = vec3(0.0);
  float opacity = 1.0;

  dithering -= 0.5;
  float brightness = clamp(lum + dithering / colorSteps, 0.0, 1.0);
  brightness = mix(0.0, brightness, frame);
  brightness = mix(0.0, brightness, image.a);
  float quantLum = floor(brightness * colorSteps + 0.5) / colorSteps;
  quantLum = mix(0.0, quantLum, frame);

  if (u_originalColors > 0.5) {
    vec3 normColor = image.rgb / max(lum, 0.001);
    color = normColor * quantLum;
    float quantAlpha = floor(image.a * colorSteps + 0.5) / colorSteps;
    opacity = mix(quantLum, 1.0, quantAlpha);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;
    vec3 hlColor = u_colorHighlight.rgb * u_colorHighlight.a;
    float hlOpacity = u_colorHighlight.a;

    float hlEdge = step(1.02 - 0.02 * u_colorSteps, brightness);
    fgColor = mix(fgColor, hlColor, hlEdge);
    fgOpacity = mix(fgOpacity, hlOpacity, hlEdge);

    color = fgColor * quantLum;
    opacity = fgOpacity * quantLum;
    color += bgColor * (1.0 - opacity);
    opacity += bgOpacity * (1.0 - opacity);
  }

  return vec4(color, opacity);
}
`;
