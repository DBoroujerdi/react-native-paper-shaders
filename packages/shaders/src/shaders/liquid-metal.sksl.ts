// SkSL port of @paper-design/shaders' Liquid Metal fragment shader (shape-only path).
// Source: packages/shaders/src/shaders/liquid-metal.ts
//
// Like Gem Smoke, the original supports both image-driven and procedural-shape paths.
// This port keeps only the shape branch (none/circle/daisy/diamond/metaballs) so it
// renders without shipping a sampler2D + Poisson-rolloff texture.

import { declarePI, rotation2, simplexNoise, sizingHelpers } from "./shader-utils.sksl";

export const LIQUID_METAL_SKSL = `
${declarePI}
${rotation2}
${simplexNoise}

uniform float u_time;

uniform vec4  u_colorBack;
uniform vec4  u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
uniform float u_shape;

${sizingHelpers}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {
  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  // Image branch's "bump = smoothstep(.2,.8,bump)" is skipped — shape-only path.
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_objectUV + .5;
  uv.y = 1. - uv.y;

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float ang = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(ang);
  float sinA = sin(ang);
  rotatedUV = vec2(
    rotatedUV.x * cosA - rotatedUV.y * sinA,
    rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_shape < 1.) {
    vec2 borderUV = v_responsiveUV + .5;
    float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
    vec2 mask = min(borderUV, 1. - borderUV);
    vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
    float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
    float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
    maskX = pow(maskX, .25);
    maskY = pow(maskY, .25);
    edge = clamp(1. - maskX * maskY, 0., 1.);

    uv = v_responsiveUV;
    if (ratio > 1.) {
      uv.y /= ratio;
    } else {
      uv.x *= ratio;
    }
    uv += .5;
    uv.y = 1. - uv.y;

    cycleWidth *= 2.;
    contOffset = 1.5;
  } else if (u_shape < 2.) {
    vec2 shapeUV = uv - .5;
    shapeUV *= .67;
    edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
  } else if (u_shape < 3.) {
    vec2 shapeUV = uv - .5;
    shapeUV *= 1.68;
    float r = length(shapeUV) * 2.;
    float a = atan(shapeUV.y, shapeUV.x) + .2;
    r *= (1. + .05 * sin(3. * a + 2. * t));
    float f = abs(cos(a * 3.));
    edge = smoothstep(f, f + .7, r);
    edge *= edge;
    uv *= .8;
    cycleWidth *= 1.6;
  } else if (u_shape < 4.) {
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
    vec2 shapeUV = uv - .5;
    shapeUV *= 1.3;
    edge = 0.;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float spd = 1.5 + 2./3. * sin(fi * 12.345);
      float a2 = -fi * 1.5;
      vec2 dir1 = vec2(cos(a2), sin(a2));
      vec2 dir2 = vec2(cos(a2 + 1.57), sin(a2 + 1.));
      vec2 traj = .4 * (dir1 * sin(t * spd + fi * 1.23) + dir2 * cos(t * (spd * 0.7) + fi * 2.17));
      float d = length(shapeUV + traj);
      edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
    }
    edge = 1. - smoothstep(.65, .9, edge);
    edge = pow(edge, 4.);
  }

  edge = mix(smoothstep(.9 - 2. * 0.001, .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  float opacity = 1. - smoothstep(.9 - 2. * 0.001, .9, edge);
  if (u_shape < 2.) {
    edge = 1.2 * edge;
  } else if (u_shape < 5.) {
    edge = 1.8 * pow(edge, 1.5);
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);

  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;

  float colorDispersion = clamp(1. - bump, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  // Shape-only blur formula.
  float blur = u_softness / 15. + .3 * 0.;

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + 0.001, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + 0.001, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + 0.001, bump, u_colorTint.b);

  vec3 color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  return vec4(color, opacity);
}
`;
