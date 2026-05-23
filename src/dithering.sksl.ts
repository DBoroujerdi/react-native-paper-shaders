// SkSL port of @paper-design/shaders' Dithering fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/dithering.frag
//
// Differences from the GLSL ES 300 original:
//   - No #version / precision / out declarations (SkSL has none of those).
//   - Entry point is `vec4 main(vec2 fragCoord)` returning a color.
//   - `gl_FragCoord.xy` is replaced with `fragCoord`.
//   - `ivec2` is renamed to `int2` (SkSL spelling).
//   - The dithering-type switch is rewritten as an if/else-if chain.

import {
  declarePI,
  proceduralHash11,
  proceduralHash21,
  simplexNoise,
} from "./shader-utils.sksl";

export const DITHERING_SKSL = `
${declarePI}
${proceduralHash11}
${proceduralHash21}
${simplexNoise}

uniform float u_time;
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
uniform float u_pxSize;
uniform vec4  u_colorBack;
uniform vec4  u_colorFront;
uniform float u_shape;
uniform float u_type;

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));
  return noise;
}

// SkSL rejects array initializers (construction of array type int[N] is not supported,
// and initializers are not permitted on arrays), so each Bayer matrix is encoded as a
// chained-if lookup. Identical math to Paper's bayerNxN[i]; just spelled out.

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
  if (size == 2) {
    return bayer2(index) / 4.0;
  } else if (size == 4) {
    return bayer4(index) / 16.0;
  } else if (size == 8) {
    return bayer8(index) / 64.0;
  }
  return 0.0;
}

vec4 main(vec2 fragCoord) {
  // Paper's GLSL uses gl_FragCoord which is in device pixels, but SkSL's fragCoord
  // is in the Canvas's logical (point) coordinates. Scale up so the rest of the math
  // matches u_resolution, which we pass in device pixels.
  fragCoord *= u_pixelRatio;

  float t = .5 * u_time;

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = fragCoord - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec2 shapeUV = normalizedUV;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 boxSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  if (u_shape > 3.5) {
    // Shapes 4-7: object patterns (wave / ripple / swirl / sphere).
    vec2 objectBoxSize = vec2(0.);
    objectBoxSize.x = min(boxSize.x, boxSize.y);
    if (u_fit == 1.) {
      objectBoxSize.x = min(u_resolution.x, u_resolution.y);
    } else if (u_fit == 2.) {
      objectBoxSize.x = max(u_resolution.x, u_resolution.y);
    }
    objectBoxSize.y = objectBoxSize.x;
    vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

    shapeUV *= objectWorldScale;
    shapeUV += boxOrigin * (objectWorldScale - 1.);
    shapeUV += vec2(-u_offsetX, u_offsetY);
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
  } else {
    // Shapes 1-3: pattern patterns (simplex / warp / dots).
    vec2 patternBoxSize = vec2(0.);
    patternBoxSize.x = patternBoxRatio * min(boxSize.x / patternBoxRatio, boxSize.y);
    float patternWorldNoFitBoxWidth = patternBoxSize.x;
    if (u_fit == 1.) {
      patternBoxSize.x = patternBoxRatio * min(u_resolution.x / patternBoxRatio, u_resolution.y);
    } else if (u_fit == 2.) {
      patternBoxSize.x = patternBoxRatio * max(u_resolution.x / patternBoxRatio, u_resolution.y);
    }
    patternBoxSize.y = patternBoxSize.x / patternBoxRatio;
    vec2 patternWorldScale = u_resolution.xy / patternBoxSize;

    shapeUV += vec2(-u_offsetX, u_offsetY) / patternWorldScale;
    shapeUV += boxOrigin;
    shapeUV -= boxOrigin / patternWorldScale;
    shapeUV *= u_resolution.xy;
    shapeUV /= u_pixelRatio;
    if (u_fit > 0.) {
      shapeUV *= (patternWorldNoFitBoxWidth / patternBoxSize.x);
    }
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
    shapeUV += boxOrigin / patternWorldScale;
    shapeUV -= boxOrigin;
    shapeUV += .5;
  }

  float shape = 0.;
  if (u_shape < 1.5) {
    // Simplex noise.
    shapeUV *= .001;
    shape = 0.5 + 0.5 * getSimplexNoise(shapeUV, t);
    shape = smoothstep(0.3, 0.9, shape);
  } else if (u_shape < 2.5) {
    // Warp.
    shapeUV *= .003;
    for (float i = 1.0; i < 6.0; i += 1.0) {
      shapeUV.x += 0.6 / i * cos(i * 2.5 * shapeUV.y + t);
      shapeUV.y += 0.6 / i * cos(i * 1.5 * shapeUV.x + t);
    }
    shape = .15 / max(0.001, abs(sin(t - shapeUV.y - shapeUV.x)));
    shape = smoothstep(0.02, 1., shape);
  } else if (u_shape < 3.5) {
    // Dots.
    shapeUV *= .05;
    float stripeIdx = floor(2. * shapeUV.x / TWO_PI);
    float rnd = hash11(stripeIdx * 10.);
    rnd = sign(rnd - .5) * pow(.1 + abs(rnd), .4);
    shape = sin(shapeUV.x) * cos(shapeUV.y - 5. * rnd * t);
    shape = pow(abs(shape), 6.);
  } else if (u_shape < 4.5) {
    // Sine wave.
    shapeUV *= 4.;
    float wave = cos(.5 * shapeUV.x - 2. * t) * sin(1.5 * shapeUV.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUV.y + wave);
  } else if (u_shape < 5.5) {
    // Ripple.
    float dist = length(shapeUV);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;
  } else if (u_shape < 6.5) {
    // Swirl.
    float l = length(shapeUV);
    float angle = 6. * atan(shapeUV.y, shapeUV.x) + 4. * t;
    float twist = 1.2;
    float offset = 1. / pow(max(l, 1e-6), twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);
  } else {
    // Sphere.
    shapeUV *= 2.;
    float d = 1. - pow(length(shapeUV), 2.);
    vec3 pos = vec3(shapeUV, sqrt(max(0., d)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }

  int type = int(floor(u_type));
  float dithering = 0.0;
  if (type == 1) {
    dithering = step(hash21(ditheringNoiseUV), shape);
  } else if (type == 2) {
    dithering = getBayerValue(pxSizeUV, 2);
  } else if (type == 3) {
    dithering = getBayerValue(pxSizeUV, 4);
  } else {
    dithering = getBayerValue(pxSizeUV, 8);
  }

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  return vec4(color, opacity);
}
`;
