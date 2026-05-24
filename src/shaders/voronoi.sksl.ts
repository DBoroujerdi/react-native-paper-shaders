// SkSL port of @paper-design/shaders' Voronoi fragment shader.
// Source: https://github.com/paper-design/shaders packages/shaders/src/shaders/voronoi.ts
//
// Notes on the port:
//   - Paper samples a noise texture via textureRandomizerGB(p) to get a 2D random per cell.
//     SkSL runtime effects can't ship a sampler2D, so we substitute the procedural hash22
//     (matches Paper's hash22 helper in shader-utils.ts). The look is very close — the
//     "rand" channel used as the cell color index is the .x component of hash22.
//   - v_patternUV is computed inline via paperComputeUVs.
//   - u_colors is a fixed vec4[5] uniform; chained-if lookup avoids dynamic indexing issues.

import {
  declarePI,
  proceduralHash22,
  sizingHelpers,
} from "./shader-utils.sksl";

export const VORONOI_MAX_COLORS = 5;

export const VORONOI_SKSL = `
${declarePI}
${proceduralHash22}
${sizingHelpers}

uniform float u_time;

// SkSL forbids dynamic indexing into uniform arrays in RuntimeEffects, so each
// color slot is its own uniform and pickColor(int) does the chained-if lookup.
uniform vec4  u_color0;
uniform vec4  u_color1;
uniform vec4  u_color2;
uniform vec4  u_color3;
uniform vec4  u_color4;

vec4 pickColor(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  return u_color4;
}
uniform float u_colorsCount;
uniform float u_stepsPerColor;
uniform vec4  u_colorGlow;
uniform vec4  u_colorGap;
uniform float u_distortion;
uniform float u_gap;
uniform float u_glow;

vec4 getColor(int i) {
  if (i == 0) return pickColor(0);
  if (i == 1) return pickColor(1);
  if (i == 2) return pickColor(2);
  if (i == 3) return pickColor(3);
  return pickColor(4);
}

// Procedural substitute for Paper's textureRandomizerGB: returns a 2D random in [0,1].
// Paper does floor(p)/100 + .5 then samples the .gb of the noise texture; we just hash
// floor(p) directly, which gives a similar per-cell distribution.
vec2 randomGB(vec2 p) {
  return hash22(floor(p));
}

vec4 voronoi(vec2 x, float t) {
  vec2 ip = floor(x);
  vec2 fp = fract(x);

  vec2 mg = vec2(0.);
  vec2 mr = vec2(0.);
  float md = 8.;
  float rand = 0.;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = randomGB(ip + g);
      float raw_hash = o.x;
      o = .5 + u_distortion * sin(t + TWO_PI * o);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        mr = r;
        mg = g;
        rand = raw_hash;
      }
    }
  }

  md = 8.;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = randomGB(ip + g);
      o = .5 + u_distortion * sin(t + TWO_PI * o);
      vec2 r = g + o - fp;
      if (dot(mr - r, mr - r) > .00001) {
        md = min(md, dot(.5 * (mr + r), normalize(r - mr)));
      }
    }
  }

  return vec4(md, mr, rand);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV;
  vec2 v_patternUV;
  vec2 v_responsiveUV;
  vec2 v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_patternUV;
  shape_uv *= 1.25;

  float t = u_time;
  vec4 voronoiRes = voronoi(shape_uv, t);

  float shape = clamp(voronoiRes.w, 0., 1.);
  float mixer = (shape - .5 / u_colorsCount) * u_colorsCount;
  float steps = max(1., u_stepsPerColor);

  vec4 gradient = getColor(0);
  gradient.rgb *= gradient.a;
  int count = int(u_colorsCount);
  for (int i = 1; i < ${VORONOI_MAX_COLORS}; i++) {
    if (i >= count) break;
    float localT = clamp(mixer - float(i - 1), 0.0, 1.0);
    localT = floor(localT * steps + .5) / steps;
    vec4 c = getColor(i);
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  if ((mixer < 0.) || (mixer > (u_colorsCount - 1.))) {
    float localT = mixer + 1.;
    if (mixer > (u_colorsCount - 1.)) {
      localT = mixer - (u_colorsCount - 1.);
    }
    localT = floor(localT * steps + .5) / steps;
    vec4 cFst = getColor(0);
    cFst.rgb *= cFst.a;
    vec4 cLast = getColor(int(u_colorsCount - 1.));
    cLast.rgb *= cLast.a;
    gradient = mix(cLast, cFst, localT);
  }

  vec3 cellColor = gradient.rgb;
  float cellOpacity = gradient.a;

  float glows = length(voronoiRes.yz * u_glow);
  glows = pow(glows, 1.5);

  vec3 color = mix(cellColor, u_colorGlow.rgb * u_colorGlow.a, u_colorGlow.a * glows);
  float opacity = cellOpacity + u_colorGlow.a * glows;

  float edge = voronoiRes.x;
  float smoothEdge = .02 / (2. * u_scale) * (1. + .5 * u_gap);
  edge = smoothstep(u_gap - smoothEdge, u_gap + smoothEdge, edge);

  color = mix(u_colorGap.rgb * u_colorGap.a, color, edge);
  opacity = mix(u_colorGap.a, opacity, edge);

  return vec4(color, opacity);
}
`;
