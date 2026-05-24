// SkSL port of @paper-design/shaders' DotOrbit fragment shader.
// Source: packages/shaders/src/shaders/dot-orbit.ts
//
// Notes:
//   - Paper samples a precomputed 256x256 noise texture for randomR/randomGB.
//     SkSL RuntimeEffect can't easily ship a sampler2D, so we substitute with
//     procedural hash21/hash22 over floor(p). Visually equivalent, different
//     specific pixel pattern.
//   - The original uses `uniform vec4 pickColor(10)`. SkSL supports uniform
//     arrays of vec4, indexed inside a fixed-bound loop — kept as-is.
//   - Pattern-UV math comes from the shared sizingHelpers function.

import {
  declarePI,
  proceduralHash21,
  proceduralHash22,
  rotation2,
  sizingHelpers,
} from "./shader-utils.sksl";

export const DOT_ORBIT_MAX_COLORS = 10;

export const DOT_ORBIT_SKSL = `
${declarePI}
${proceduralHash21}
${proceduralHash22}
${rotation2}

uniform float u_time;

uniform vec4  u_colorBack;
// SkSL forbids dynamic indexing into uniform arrays in RuntimeEffects, so each
// color slot is its own uniform and pickColor(int) does the chained-if lookup.
uniform vec4  u_color0;
uniform vec4  u_color1;
uniform vec4  u_color2;
uniform vec4  u_color3;
uniform vec4  u_color4;
uniform vec4  u_color5;
uniform vec4  u_color6;
uniform vec4  u_color7;
uniform vec4  u_color8;
uniform vec4  u_color9;

vec4 pickColor(int i) {
  if (i == 0) return u_color0;
  if (i == 1) return u_color1;
  if (i == 2) return u_color2;
  if (i == 3) return u_color3;
  if (i == 4) return u_color4;
  if (i == 5) return u_color5;
  if (i == 6) return u_color6;
  if (i == 7) return u_color7;
  if (i == 8) return u_color8;
  return u_color9;
}
uniform float u_colorsCount;
uniform float u_stepsPerColor;
uniform float u_size;
uniform float u_sizeRange;
uniform float u_spreading;

${sizingHelpers}

// Procedural drop-in for Paper's textureRandomizerR / textureRandomizerGB,
// which sample a 256x256 noise texture seeded by floor(p)/100. The behavior
// reduces to hash(floor(p)).
float randomR(vec2 p) {
  return hash21(floor(p) + 0.5);
}
vec2 randomGB(vec2 p) {
  return hash22(floor(p) + 7.7);
}

vec3 voronoiShape(vec2 uv, float time) {
  vec2 i_uv = floor(uv);
  vec2 f_uv = fract(uv);

  float spreading = .25 * clamp(u_spreading, 0., 1.);

  float minDist = 1.;
  vec2 randomizer = vec2(0.);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 tileOffset = vec2(float(x), float(y));
      vec2 rand = randomGB(i_uv + tileOffset);
      vec2 cellCenter = vec2(.5 + 1e-4);
      cellCenter += spreading * cos(time + TWO_PI * rand);
      cellCenter -= .5;
      cellCenter = rotate(cellCenter, randomR(vec2(rand.x, rand.y)) + .1 * time);
      cellCenter += .5;
      float dist = length(tileOffset + cellCenter - f_uv);
      if (dist < minDist) {
        minDist = dist;
        randomizer = rand;
      }
    }
  }

  return vec3(minDist, randomizer);
}

vec4 main(vec2 fragCoord) {
  fragCoord *= u_pixelRatio;

  vec2 v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize;
  paperComputeUVs(fragCoord, v_objectUV, v_patternUV, v_responsiveUV, v_responsiveBoxGivenSize);

  vec2 shape_uv = v_patternUV;
  shape_uv *= 1.5;

  const float firstFrameOffset = -10.;
  float t = u_time + firstFrameOffset;

  vec3 voronoi = voronoiShape(shape_uv, t) + 1e-4;

  float radius = .25 * clamp(u_size, 0., 1.) - .5 * clamp(u_sizeRange, 0., 1.) * voronoi[2];
  float dist = voronoi[0];
  float edgeWidth = 0.001;
  float dots = 1. - smoothstep(radius - edgeWidth, radius + edgeWidth, dist);

  float shape = voronoi[1];

  float mixer = shape * (u_colorsCount - 1.);
  mixer = (shape - .5 / u_colorsCount) * u_colorsCount;
  float steps = max(1., u_stepsPerColor);

  vec4 gradient = pickColor(0);
  gradient.rgb *= gradient.a;
  for (int i = 1; i < ${DOT_ORBIT_MAX_COLORS}; i++) {
    if (i >= int(u_colorsCount)) break;
    float localT = clamp(mixer - float(i - 1), 0.0, 1.0);
    localT = floor(localT * steps + 0.5) / steps;
    vec4 c = pickColor(i);
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  if ((mixer < 0.) || (mixer > (u_colorsCount - 1.))) {
    float localT = mixer + 1.;
    if (mixer > (u_colorsCount - 1.)) {
      localT = mixer - (u_colorsCount - 1.);
    }
    localT = floor(localT * steps + 0.5) / steps;
    vec4 cFst = pickColor(0);
    cFst.rgb *= cFst.a;
    vec4 cLast = pickColor(int(u_colorsCount - 1.));
    cLast.rgb *= cLast.a;
    gradient = mix(cLast, cFst, localT);
  }

  vec3 color = gradient.rgb * dots;
  float opacity = gradient.a * dots;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  return vec4(color, opacity);
}
`;
