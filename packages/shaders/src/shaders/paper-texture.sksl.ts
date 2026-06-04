// SkSL port of @paper-design/shaders' PaperTexture fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/paper-texture.ts
//
// Differences from the GLSL ES 300 original:
//   - No #version / precision / in/out declarations.
//   - Entry point is `vec4 main(vec2 fragCoord)`; first line scales to device pixels.
//   - The `u_noiseTexture` sampler is replaced with procedural hash21 — the WebGL
//     build samples a 100x100 PNG of random values, but a procedural hash gives
//     equivalent statistical noise without needing to load an image at runtime.
//   - The optional `u_image` sampler is stubbed (no input image). The `image`
//     branch is short-circuited to a transparent overlay, so the paper texture
//     itself (the actual subject of this shader) is what you see.
//   - The `gl_FragCoord` references are replaced with scaled `fragCoord`.

import { declarePI } from "./shader-utils.sksl";

export const PAPER_TEXTURE_SKSL = `
${declarePI}

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

uniform float u_contrast;
uniform float u_roughness;
uniform float u_fiber;
uniform float u_fiberSize;
uniform float u_crumples;
uniform float u_crumpleSize;
uniform float u_folds;
uniform float u_foldCount;
uniform float u_drops;
uniform float u_seed;
uniform float u_fade;

// ---- helpers ---------------------------------------------------------------

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

// Procedural replacement for Paper's noise texture sample. The original samples
// a precomputed 100x100 PNG; this returns equivalent uniformly-distributed
// noise from a deterministic hash, producing visually similar results.
float hash21(vec2 p) {
  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float randomR(vec2 p) {
  return hash21(floor(p) + 17.13);
}
float randomG(vec2 p) {
  return hash21(floor(p) + 71.71);
}
vec2 randomGB(vec2 p) {
  vec2 f = floor(p);
  return vec2(hash21(f + 71.71), hash21(f + 113.7));
}
float fiberRandom(vec2 p) {
  return hash21(floor(p) + 211.3);
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
float fbm(vec2 n) {
  float total = 0.0; float amplitude = 0.4;
  for (int i = 0; i < 3; i++) {
    total += valueNoise(n) * amplitude;
    n *= 1.99;
    amplitude *= 0.65;
  }
  return total;
}

float roughnessFn(vec2 p) {
  p *= 0.1;
  float o = 0.0;
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    vec4 w = vec4(floor(q), ceil(q));
    vec2 f = fract(q);
    o += mix(
      mix(randomG(w.xy), randomG(w.xw), f.y),
      mix(randomG(w.zy), randomG(w.zw), f.y),
      f.x);
    o += 0.2 / exp(2.0 * abs(sin(0.2 * q.x + 0.5 * q.y)));
    q *= 2.1;
  }
  return o / 3.0;
}

float fiberValueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = fiberRandom(i);
  float b = fiberRandom(i + vec2(1.0, 0.0));
  float c = fiberRandom(i + vec2(0.0, 1.0));
  float d = fiberRandom(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
float fiberNoiseFbm(vec2 n, vec2 seedOffset) {
  float total = 0.0; float amplitude = 1.0;
  for (int i = 0; i < 4; i++) {
    n = rotate(n, 0.7);
    total += fiberValueNoise(n + seedOffset) * amplitude;
    n *= 2.0;
    amplitude *= 0.6;
  }
  return total;
}
float fiberNoise(vec2 uv, vec2 seedOffset) {
  float epsilon = 0.001;
  float n1 = fiberNoiseFbm(uv + vec2(epsilon, 0.0), seedOffset);
  float n2 = fiberNoiseFbm(uv - vec2(epsilon, 0.0), seedOffset);
  float n3 = fiberNoiseFbm(uv + vec2(0.0, epsilon), seedOffset);
  float n4 = fiberNoiseFbm(uv - vec2(0.0, epsilon), seedOffset);
  return length(vec2(n1 - n2, n3 - n4)) / (2.0 * epsilon);
}

float crumpledNoise(vec2 t, float pw) {
  vec2 p = floor(t);
  float wsum = 0.0;
  float cl = 0.0;
  for (int y = -1; y < 2; y += 1) {
    for (int x = -1; x < 2; x += 1) {
      vec2 b = vec2(float(x), float(y));
      vec2 q = b + p;
      vec2 q2 = q - floor(q / 8.0) * 8.0;
      vec2 c = q + randomGB(q2);
      vec2 r = c - t;
      float w = pow(smoothstep(0.0, 1.0, 1.0 - abs(r.x)), pw) *
                pow(smoothstep(0.0, 1.0, 1.0 - abs(r.y)), pw);
      cl += (0.5 + 0.5 * sin((q2.x + q2.y * 5.0) * 8.0)) * w;
      wsum += w;
    }
  }
  return pow(wsum != 0.0 ? cl / wsum : 0.0, 0.5) * 2.0;
}
float crumplesShape(vec2 uv) {
  return crumpledNoise(uv * 0.25, 16.0) * crumpledNoise(uv * 0.5, 2.0);
}

vec2 foldsFn(vec2 uv) {
  vec3 pp = vec3(0.0);
  float l = 9.0;
  for (float i = 0.0; i < 15.0; i += 1.0) {
    if (i >= u_foldCount) break;
    vec2 rand = randomGB(vec2(i, i * u_seed));
    float an = rand.x * TWO_PI;
    vec2 p = vec2(cos(an), sin(an)) * rand.y;
    float dist = distance(uv, p);
    l = min(l, dist);
    if (l == dist) {
      pp.xy = (uv - p.xy);
      pp.z = dist;
    }
  }
  return mix(pp.xy, vec2(0.0), pow(pp.z, 0.25));
}

float dropsFn(vec2 uv) {
  vec2 iDropsUV = floor(uv);
  vec2 fDropsUV = fract(uv);
  float dropsMinDist = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 offset = randomGB(iDropsUV + neighbor);
      offset = 0.5 + 0.5 * sin(10.0 * u_seed + TWO_PI * offset);
      vec2 pos = neighbor + offset - fDropsUV;
      float dist = length(pos);
      dropsMinDist = min(dropsMinDist, dropsMinDist * dist);
    }
  }
  return 1.0 - smoothstep(0.05, 0.09, pow(dropsMinDist, 0.5));
}

// Procedural stub for the optional source image. Returns a vertical gradient
// in the colorFront -> colorBack range so the texture has something to layer
// over when image support is added later.
vec4 stubImage(vec2 uv) {
  return vec4(0.0, 0.0, 0.0, 0.0);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  // Build v_imageUV inline (mirrors Paper's vertex shader). With no image
  // bound we use u_imageAspectRatio = 1.
  float imageAspect = 1.0;
  vec2 uv = (fragCoord / u_resolution - 0.5);
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

  vec2 v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.0);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= imageAspect;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= imageAspect;
  v_imageUV += 0.5;
  v_imageUV.y = 1.0 - v_imageUV.y;

  vec2 imageUV = v_imageUV;
  vec2 patternUV = v_imageUV - 0.5;
  patternUV = 5.0 * (patternUV * vec2(imageAspect, 1.0));

  vec2 roughnessUv = 1.5 * (fragCoord - 0.5 * u_resolution) / u_pixelRatio;
  float roughness = roughnessFn(roughnessUv + vec2(1.0, 0.0)) - roughnessFn(roughnessUv - vec2(1.0, 0.0));

  vec2 crumplesUV = fract(patternUV * 0.02 / max(u_crumpleSize, 1e-4) - u_seed) * 32.0;
  float crumples = u_crumples * (crumplesShape(crumplesUV + vec2(0.05, 0.0)) - crumplesShape(crumplesUV));

  vec2 fiberUV = 2.0 / max(u_fiberSize, 1e-4) * patternUV;
  float fiber = fiberNoise(fiberUV, vec2(0.0));
  fiber = 0.5 * u_fiber * (fiber - 1.0);

  vec2 normal = vec2(0.0);
  vec2 normalImage = vec2(0.0);

  vec2 foldsUV = patternUV * 0.12;
  foldsUV = rotate(foldsUV, 4.0 * u_seed);
  vec2 w = foldsFn(foldsUV);
  foldsUV = rotate(foldsUV + 0.007 * cos(u_seed), 0.01 * sin(u_seed));
  vec2 w2 = foldsFn(foldsUV);

  float drops = u_drops * dropsFn(patternUV * 2.0);

  float fade = u_fade * fbm(0.17 * patternUV + 10.0 * u_seed);
  fade = clamp(8.0 * fade * fade * fade, 0.0, 1.0);

  w = mix(w, vec2(0.0), fade);
  w2 = mix(w2, vec2(0.0), fade);
  crumples = mix(crumples, 0.0, fade);
  drops = mix(drops, 0.0, fade);
  fiber *= mix(1.0, 0.5, fade);
  roughness *= mix(1.0, 0.5, fade);

  normal.xy += u_folds * min(5.0 * u_contrast, 1.0) * 4.0 * max(vec2(0.0), w + w2);
  normalImage.xy += u_folds * 2.0 * w;

  normal.xy += crumples;
  normalImage.xy += 1.5 * crumples;

  normal.xy += 3.0 * drops;
  normalImage.xy += 0.2 * drops;

  normal.xy += u_roughness * 1.5 * roughness;
  normal.xy += fiber;

  normalImage += u_roughness * 0.75 * roughness;
  normalImage += 0.2 * fiber;

  vec3 lightPos = vec3(1.0, 2.0, 1.0);
  float res = dot(normalize(vec3(normal, 9.5 - 9.0 * pow(u_contrast, 0.1))), normalize(lightPos));

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1.0 - opacity);
  opacity += bgOpacity * (1.0 - opacity);

  color -= 0.007 * drops;

  return vec4(color, opacity);
}
`;
