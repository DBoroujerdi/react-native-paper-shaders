// SkSL port of @paper-design/shaders' Gem Smoke fragment shader (shape-only path).
// Source: packages/shaders/src/shaders/gem-smoke.ts
//
// The original supports two modes: image-driven (sample a preprocessed Poisson rolloff
// image of a logo) and shape-driven (procedural circle/daisy/diamond/metaballs). This
// port keeps only the procedural shape path — image mode would require shipping a
// sampler2D plus the precomputed roundness texture, which Skia runtime effects in this
// gallery don't currently wire up. Defaults to 'diamond' to match Paper's default preset.

import { declarePI, rotation2, sizingHelpers } from "./shader-utils.sksl";

export const GEM_SMOKE_MAX_COLORS = 6;

export const GEM_SMOKE_SKSL = `
${declarePI}
${rotation2}

uniform float u_time;

// SkSL forbids dynamic indexing into uniform arrays in RuntimeEffects, so each
// color slot is its own uniform and pickColor(int) does the chained-if lookup.
uniform vec4  u_color0;
uniform vec4  u_color1;
uniform vec4  u_color2;
uniform vec4  u_color3;
uniform vec4  u_color4;
uniform vec4  u_color5;

vec4 pickColor(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  if (i == 4) return u_color4;
  return u_color5;
}
uniform float u_colorsCount;
uniform vec4  u_colorBack;
uniform vec4  u_colorInner;

uniform float u_innerDistortion;
uniform float u_outerDistortion;
uniform float u_outerGlow;
uniform float u_innerGlow;
uniform float u_offset;
uniform float u_angle;
uniform float u_size;
uniform float u_shape;

${sizingHelpers}

float sst(float a, float b, float x) {
  return smoothstep(a, b, x);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  float time = u_time;

  float roundness = 0.;
  float imgAlpha = 0.;

  // Shape-only branch (image branch omitted; SkSL runtime effects don't ship u_image).
  vec2 uv = v_objectUV + .5;
  uv.y = 1. - uv.y;
  float edge = 0.;

  if (u_shape < 1.) {
    // full-fill on canvas
    vec2 borderUV = v_responsiveUV + .5;
    vec2 mask = min(borderUV, 1. - borderUV);
    vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
    float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
    float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
    maskX = pow(maskX, .25);
    maskY = pow(maskY, .25);
    edge = clamp(1. - maskX * maskY, 0., 1.);
  } else if (u_shape < 2.) {
    // circle
    vec2 shapeUV = uv - .5;
    shapeUV *= .67;
    edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
  } else if (u_shape < 3.) {
    // daisy
    vec2 shapeUV = uv - .5;
    shapeUV *= 1.68;

    float r = length(shapeUV) * 2.;
    float a = atan(shapeUV.y, shapeUV.x) + .2;
    r *= (1. + .05 * sin(3. * a + 2. * time));
    float f = abs(cos(a * 3.));
    edge = smoothstep(f, f + .7, r);
    edge *= edge;
  } else if (u_shape < 4.) {
    // diamond
    vec2 shapeUV = uv - .5;
    shapeUV = rotate(shapeUV, .25 * PI);
    shapeUV *= 1.42;
    shapeUV += .5;
    vec2 mask = min(shapeUV, 1. - shapeUV);
    vec2 pixel_thickness = vec2(.15);
    float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
    float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
    maskX = pow(maskX, .25);
    maskY = pow(maskY, .25);
    edge = clamp(1. - maskX * maskY, 0., 1.);
  } else if (u_shape < 5.) {
    // metaballs
    vec2 shapeUV = uv - .5;
    shapeUV *= 1.3;
    edge = 0.;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float speed = 1.5 + 2./3. * sin(fi * 12.345);
      float ang = -fi * 1.5;
      vec2 dir1 = vec2(cos(ang), sin(ang));
      vec2 dir2 = vec2(cos(ang + 1.57), sin(ang + 1.));
      vec2 traj = .4 * (dir1 * sin(time * speed + fi * 1.23) + dir2 * cos(time * (speed * 0.7) + fi * 2.17));
      float d = length(shapeUV + traj);
      edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
    }
    edge = 1. - smoothstep(.65, .9, edge);
    edge = pow(edge, 4.);
  }

  imgAlpha = 1. - smoothstep(.9 - 2. * 0.001, .9, edge);
  roundness = 1. - edge;

  // Smoke UV setup
  vec2 smokeUV = v_objectUV;
  smokeUV = rotate(smokeUV, u_angle * PI / 180.);
  smokeUV *= mix(4., 1., u_size);

  vec2 innerUV = smokeUV;
  vec2 outerUV = smokeUV;

  innerUV.y += u_innerDistortion * (1. - sst(0., 1., length(.4 * innerUV)));
  innerUV.y -= .4 * u_innerDistortion;
  innerUV.y += .7 * u_offset * roundness;

  outerUV.y += u_outerDistortion * (1. - sst(0., 1., length(.4 * outerUV)));
  outerUV.y -= .4 * u_outerDistortion;

  float innerSwirl = u_innerDistortion * roundness;
  float outerSwirl = u_outerDistortion;

  for (int i = 1; i < 5; i++) {
    float fi = float(i);

    // SkSL runtime effects don't expose derivatives; substitute a constant dampening so the
    // iteration still converges (slightly less stretch-adaptive than Paper's web version).
    float dampenIn = 1.0;
    float sIn = innerSwirl * dampenIn;
    innerUV.x += sIn / fi * cos(time + fi * 2.9 * innerUV.y);
    innerUV.y += sIn / fi * cos(time + fi * 1.5 * innerUV.x);

    float dampenOut = 1.0;
    float sOut = outerSwirl * dampenOut;
    outerUV.x += sOut / fi * cos(time + fi * 2.9 * outerUV.y);
    outerUV.y += sOut / fi * cos(time + fi * 1.5 * outerUV.x);
  }

  float innerShape = exp(-1.5 * dot(innerUV, innerUV));
  float outerShape = exp(-1.5 * dot(outerUV, outerUV));

  float outerMask = pow(u_outerGlow, 2.) * (1. - imgAlpha);
  float innerMask = (.01 + .99 * u_innerGlow) * imgAlpha;

  innerShape *= innerMask;
  outerShape *= outerMask;

  float mixer = (innerShape + outerShape) * u_colorsCount;
  vec4 gradient = pickColor(0);
  gradient.rgb *= gradient.a;

  float smokeMask = 0.;
  for (int i = 1; i < ${GEM_SMOKE_MAX_COLORS + 1}; i++) {
    if (i > int(u_colorsCount)) break;

    float m = sst(0., 1., clamp(mixer - float(i - 1), 0., 1.));
    if (i == 1) smokeMask = m;

    vec4 c = pickColor(i - 1);
    c.rgb *= c.a;
    gradient = mix(gradient, c, m);
  }

  vec3 color = gradient.rgb * smokeMask;
  float opacity = gradient.a * smokeMask;

  float innerOpacity = u_colorInner.a * imgAlpha;
  vec3 innerColor = u_colorInner.rgb * innerOpacity;
  color += innerColor * (1.0 - opacity);
  opacity += innerOpacity * (1.0 - opacity);

  vec3 backColor = u_colorBack.rgb * u_colorBack.a;
  color += backColor * (1.0 - opacity);
  opacity += u_colorBack.a * (1.0 - opacity);

  return vec4(color, opacity);
}
`;
