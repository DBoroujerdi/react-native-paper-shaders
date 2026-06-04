// GLSL helper snippets copied verbatim from @paper-design/shaders
// (packages/shaders/src/shader-utils.ts). These compile as-is under SkSL.

// SkSL does not support `#define`; use compile-time `const float` instead.
export const declarePI = `
const float TWO_PI = 6.28318530718;
const float PI = 3.14159265358979323846;
`;

// 2D rotation helper from Paper's shader-utils.ts.
export const rotation2 = `
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`;

// SkSL port of Paper's vertex-shader.ts sizing logic.
// Paper computes v_objectUV/v_patternUV/v_responsiveUV/v_imageUV in the vertex shader; we
// fold that math into a single helper called once from each shader's main(). All four UV
// flavors are returned via out parameters so the caller can pick whichever ones it uses.
// Requires sizing uniforms: u_resolution, u_pixelRatio, u_originX, u_originY, u_worldWidth,
// u_worldHeight, u_fit, u_scale, u_rotation, u_offsetX, u_offsetY. For image-mode shaders,
// also u_imageAspectRatio. fragCoord must already be in device pixels.
//
// NOTE: SkSL's fragCoord.y is top-down; Paper's WebGL gl_FragCoord.y is bottom-up. We flip y
// so the uv passed into the same fragment math lines up with Paper's output.
export const sizingHelpers = `
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

vec3 paperGetBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) {
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) {
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void paperComputeUVs(vec2 fragCoord,
                     out vec2 v_objectUV,
                     out vec2 v_patternUV,
                     out vec2 v_responsiveUV,
                     out vec2 v_responsiveBoxGivenSize) {
  // Clip-space style uv ranging -0.5..0.5 with y up, equivalent to Paper's vertex shader.
  vec2 uv;
  uv.x = fragCoord.x / u_resolution.x - 0.5;
  uv.y = 0.5 - fragCoord.y / u_resolution.y;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  // objectUV — square (ratio 1) box.
  vec2 fixedRatioBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  vec2 objectBoxSize = paperGetBoxSize(1., fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // responsiveUV
  v_responsiveBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = paperGetBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // patternUV — pixel-space pattern coordinates.
  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;
  vec3 patternBoxData = paperGetBoxSize(patternBoxRatio, patternBoxGivenSize);
  vec2 patternBoxSize = patternBoxData.xy;
  float patternBoxNoFitBoxWidth = patternBoxData.z;
  vec2 patternBoxScale = u_resolution.xy / patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  v_patternUV *= .01;
}

// Returns Paper's v_objectBoxSize (the square fit/cover/contain box in pixels).
vec2 paperObjectBoxSize() {
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  vec2 fixedRatioBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  return paperGetBoxSize(1., fixedRatioBoxGivenSize).xy;
}

// Returns Paper's v_patternBoxSize.
vec2 paperPatternBoxSize() {
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  vec2 patternBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;
  return paperGetBoxSize(patternBoxRatio, patternBoxGivenSize).xy;
}
`;

export const proceduralHash11 = `
float hash11(float p) {
  p = fract(p * 0.3183099) + 0.1;
  p *= p + 19.19;
  return fract(p * p);
}
`;

export const proceduralHash21 = `
float hash21(vec2 p) {
  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
`;

// Procedural vec2 hash. Mirrors Paper's hash22 in shader-utils.ts.
// Used as a procedural substitute for textureRandomizerGB (which samples a noise
// texture) in shaders like Voronoi and Warp — we can't ship a sampler2D with the
// SkSL runtime effect, so we approximate with a procedural hash.
export const proceduralHash22 = `
vec2 hash22(vec2 p) {
  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p.yx + 19.19);
  return fract(vec2(p.x * p.y, p.x + p.y));
}
`;

// Value noise built on hash21. Substitutes for Paper's noise-texture sampler in shaders
// that can't ship a sampler2D through SkSL — the math matches Paper's `valueNoise(...)`
// helpers that already exist on the hash21 path (e.g. mesh-gradient, static-mesh-gradient).
export const valueNoise21 = `
float valueNoise21(vec2 st) {
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
`;

// Ashima 2D simplex noise.
export const simplexNoise = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;
