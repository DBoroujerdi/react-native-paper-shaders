// SkSL port of @paper-design/shaders' HalftoneDots fragment shader.
// Source: packages/shaders/src/shaders/halftone-dots.ts
//
// Paper's original samples an HTMLImageElement via sampler2D. SkSL RuntimeEffect
// could accept an SkImage, but we choose to ship a STUB procedural image so the
// shader is fully self-contained: a smoothly-varying colorful gradient generated
// from value noise. This keeps the halftone behavior visible (varying coverage,
// per-cell color sampling, edge smoothing) without requiring any caller-side
// image plumbing. To wire up a real image, replace stubImage() with
// texture(u_image, uv).

import {
  declarePI,
  proceduralHash21,
  rotation2,
  sizingHelpers,
  valueNoise21,
} from "./shader-utils.sksl";

export const HALFTONE_DOTS_SKSL = `
${declarePI}
${proceduralHash21}
${valueNoise21}
${rotation2}


uniform vec4  u_colorFront;
uniform vec4  u_colorBack;
uniform float u_radius;
uniform float u_contrast;
uniform float u_imageAspectRatio;
uniform float u_size;
uniform float u_grainMixer;
uniform float u_grainOverlay;
uniform float u_grainSize;
uniform float u_grid;
uniform float u_originalColors;   // 0 or 1; SkSL booleans are awkward via uniforms
uniform float u_inverted;
uniform float u_type;

${sizingHelpers}

// Replicates the v_imageUV computation from Paper's vertex shader, projected
// onto fragCoord.
vec2 imageUV(vec2 fragCoord) {
  vec2 uv;
  uv.x = fragCoord.x / u_resolution.x - 0.5;
  uv.y = 0.5 - fragCoord.y / u_resolution.y;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 imageBoxSize;
  if (u_fit == 1.) {
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) {
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = 10.;
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  vec2 v = uv;
  v *= imageBoxScale;
  v += boxOrigin * (imageBoxScale - 1.);
  v += graphicOffset;
  v /= u_scale;
  v.x *= u_imageAspectRatio;
  v = graphicRotation * v;
  v.x /= u_imageAspectRatio;
  v += .5;
  v.y = 1. - v.y;
  return v;
}

// Stub for sampler2D source image — a colorful smoothly-varying procedural
// texture. Use coarse value noise for shape, modulate with a smooth gradient.
vec4 stubImage(vec2 uv) {
  // Clamp to texture range like a sampler with CLAMP_TO_EDGE.
  uv = clamp(uv, vec2(0.), vec2(1.));
  vec2 p = uv * 6.;
  float r = valueNoise21(p);
  float g = valueNoise21(p + vec2(11.3, 7.7));
  float b = valueNoise21(p + vec2(23.1, 19.9));
  // Mix with a coarse gradient so contrast is high enough for halftone to read.
  vec3 col = mix(vec3(0.1, 0.2, 0.6), vec3(1.0, 0.85, 0.4), uv.y);
  col = mix(col, vec3(r, g, b), 0.6);
  return vec4(col, 1.);
}

float sst(float edge0, float edge1, float x) {
  return smoothstep(edge0, edge1, x);
}
float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float getCircle(vec2 uv, float r, float baseR) {
  r = mix(.25 * baseR, 0., r);
  float d = length(uv - .5);
  float aa = 0.001;
  return 1. - smoothstep(r - aa, r + aa, d);
}

float getCell(vec2 uv) {
  float insideX = step(0.0, uv.x) * (1.0 - step(1.0, uv.x));
  float insideY = step(0.0, uv.y) * (1.0 - step(1.0, uv.y));
  return insideX * insideY;
}

float getCircleWithHole(vec2 uv, float r, float baseR) {
  float cell = getCell(uv);
  r = mix(.75 * baseR, 0., r);
  float rMod = mod(r, .5);
  float d = length(uv - .5);
  float aa = 0.001;
  float circle = 1. - smoothstep(rMod - aa, rMod + aa, d);
  if (r < .5) {
    return circle;
  } else {
    return cell - circle;
  }
}

float getGooeyBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = .3;
  if (u_grid == 1.) {
    sizeRadius = .42;
  }
  sizeRadius = mix(sizeRadius * baseR, 0., r);
  d = 1. - sst(0., sizeRadius, d);
  d = pow(d, 2. + baseR);
  return d;
}

float getSoftBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = clamp(baseR, 0., 1.);
  sizeRadius = mix(.5 * sizeRadius, 0., r);
  d = 1. - lst(0., sizeRadius, d);
  float powRadius = 1. - lst(0., 2., baseR);
  d = pow(d, 4. + 3. * powRadius);
  return d;
}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;
  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);
  return left * right * bottom * top;
}

float sigmoid(float x, float k) {
  return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}

float getLumAtPx(vec2 uv, float contrast) {
  vec4 tex = stubImage(uv);
  vec3 color = vec3(
    sigmoid(tex.r, contrast),
    sigmoid(tex.g, contrast),
    sigmoid(tex.b, contrast)
  );
  float lum = dot(vec3(0.2126, 0.7152, 0.0722), color);
  lum = mix(1., lum, tex.a);
  lum = (u_inverted > 0.5) ? (1. - lum) : lum;
  return lum;
}

float getLumBall(vec2 p, vec2 pad, vec2 inCellOffset, float contrast, float baseR, float stepSize, out vec4 ballColor) {
  p += inCellOffset;
  vec2 uv_i = floor(p);
  vec2 uv_f = fract(p);
  vec2 samplingUV = (uv_i + .5 - inCellOffset) * pad + vec2(.5);
  float outOfFrame = getUvFrame(samplingUV, pad * stepSize);

  float lum = getLumAtPx(samplingUV, contrast);
  ballColor = stubImage(samplingUV);
  ballColor.rgb *= ballColor.a;
  ballColor *= outOfFrame;

  float ball = 0.;
  if (u_type < 0.5) {
    ball = getCircle(uv_f, lum, baseR);
  } else if (u_type < 1.5) {
    ball = getGooeyBall(uv_f, lum, baseR);
  } else if (u_type < 2.5) {
    ball = getCircleWithHole(uv_f, lum, baseR);
  } else {
    ball = getSoftBall(uv_f, lum, baseR);
  }
  return ball * outOfFrame;
}

vec4 main(vec2 fragCoord) {
  vec2 fc = fragCoord * u_pixelRatio;
  vec2 v_imageUV = imageUV(fc);

  float stepMultiplier = 1.;
  if (u_type < 0.5) {
    stepMultiplier = 2.;
  } else if (u_type < 1.5 || (u_type > 2.5 && u_type < 3.5)) {
    stepMultiplier = 6.;
  }

  float cellsPerSide = mix(300., 7., pow(u_size, .7));
  cellsPerSide /= stepMultiplier;
  float cellSizeY = 1. / cellsPerSide;
  vec2 pad = cellSizeY * vec2(1. / u_imageAspectRatio, 1.);
  if (u_type > 0.5 && u_type < 1.5 && u_grid == 1.) {
    pad *= .7;
  }

  vec2 uv = v_imageUV;
  uv -= vec2(.5);
  uv /= pad;

  float contrast = mix(0., 15., pow(u_contrast, 1.5));
  float baseRadius = u_radius;
  if (u_originalColors > 0.5) {
    contrast = mix(.1, 4., pow(u_contrast, 2.));
    baseRadius = 2. * pow(.5 * u_radius, .3);
  }

  float totalShape = 0.;
  vec3 totalColor = vec3(0.);
  float totalOpacity = 0.;

  vec4 ballColor;
  float shape;
  float stepSize = 1. / stepMultiplier;
  // Fixed 6x6 loop (max stepMultiplier=6). We mask out iterations where
  // (xi or yi) >= stepMultiplier so the per-uniform iteration count matches
  // the original variable-step loop. SkSL forbids loops whose step depends
  // on a uniform, so this is the constant-bound replacement.
  int sm = int(stepMultiplier + 0.5);
  for (int yi = 0; yi < 6; yi++) {
    if (yi >= sm) break;
    for (int xi = 0; xi < 6; xi++) {
      if (xi >= sm) break;
      float x = -0.5 + float(xi) * stepSize;
      float y = -0.5 + float(yi) * stepSize;
      vec2 offset = vec2(x, y);

      bool skip = false;
      if (u_grid == 1.) {
        float rowIndex = floor((y + .5) / stepSize);
        float colIndex = floor((x + .5) / stepSize);
        if (sm == 1) {
          rowIndex = floor(uv.y + y + 1.);
          if (u_type > 0.5 && u_type < 1.5) {
            colIndex = floor(uv.x + x + 1.);
          }
        }
        if (u_type > 0.5 && u_type < 1.5) {
          if (mod(rowIndex + colIndex, 2.) == 1.) {
            skip = true;
          }
        } else {
          if (mod(rowIndex, 2.) == 1.) {
            offset.x += .5 * stepSize;
          }
        }
      }

      if (!skip) {
        shape = getLumBall(uv, pad, offset, contrast, baseRadius, stepSize, ballColor);
        totalColor   += ballColor.rgb * shape;
        totalShape   += shape;
        totalOpacity += shape;
      }
    }
  }

  const float eps = 1e-4;
  totalColor /= max(totalShape, eps);
  totalOpacity /= max(totalShape, eps);

  float finalShape = 0.;
  if (u_type < 0.5) {
    finalShape = min(1., totalShape);
  } else if (u_type < 1.5) {
    float aa = 0.001;
    float th = .5;
    finalShape = smoothstep(th - aa, th + aa, totalShape);
  } else if (u_type < 2.5) {
    finalShape = min(1., totalShape);
  } else {
    finalShape = totalShape;
  }

  vec2 grainSize = mix(2000., 200., u_grainSize) * vec2(1., 1. / u_imageAspectRatio);
  vec2 grainUV = v_imageUV - .5;
  grainUV *= grainSize;
  grainUV += .5;
  float grain = valueNoise21(grainUV);
  grain = smoothstep(.55, .7 + .2 * u_grainMixer, grain);
  grain *= u_grainMixer;
  finalShape = mix(finalShape, 0., grain);

  vec3 color = vec3(0.);
  float opacity = 0.;

  if (u_originalColors > 0.5) {
    color = totalColor * finalShape;
    opacity = totalOpacity * finalShape;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    color = color + bgColor * (1. - opacity);
    opacity = opacity + u_colorBack.a * (1. - opacity);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;
    color = fgColor * finalShape;
    opacity = fgOpacity * finalShape;
    color += bgColor * (1. - opacity);
    opacity += bgOpacity * (1. - opacity);
  }

  float grainOverlay = valueNoise21(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise21(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .5 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  return vec4(color, opacity);
}
`;
