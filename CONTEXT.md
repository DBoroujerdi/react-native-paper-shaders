# Why this codebase exists

## Origin

This project started with a single question: **can a [Paper Design](https://app.paper.design) shader animation run natively in React Native?**

Paper Design's editor exports React snippets built on [`@paper-design/shaders-react`](https://github.com/paper-design/shaders) — a web-only library whose effects are GLSL fragment shaders running in a WebGL canvas. The original target was one exported snippet:

```tsx
import { Dithering } from '@paper-design/shaders-react';

<Dithering speed={0.25} shape="warp" type="4x4" size={4} scale={1}
  frame={5929.724999967142} colorBack="#00000000" colorFront="#99CDFC"
  style={{ backgroundColor: '#E2ECF6', height: '319px', outline: '1px solid #B0D4F5', width: '511px' }} />
```

React Native has no WebGL canvas, but it has [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/), whose `RuntimeEffect` API runs fragment shaders written in **SkSL** (Skia's shading language, close to but not GLSL). The goal became: port Paper's shaders to SkSL and mirror Paper's React prop API, so an exported Paper snippet works in RN with only the import path and `style` changed.

After the Dithering port proved out, scope expanded to **all 29 shaders** in Paper's library, browsable via an in-app gallery (list of live preview tiles → fullscreen detail).

## What this is (and isn't)

- **It is** an exploration/playground proving the GLSL→SkSL port path, plus a reusable catalogue of porting patterns (`packages/shaders/src/shaders/_shared.ts`, the per-shader `.sksl.ts` files).
- **It is not** a production library. It is not published, not maintained against Paper upstream, and several shaders are knowingly degraded (see Limitations).

## Honest assessment of alternatives

These were considered (after the fact) and would be better choices for many real uses:

1. **WebView wrapping the original library** — ~30 min of work, perfect visual parity, fine for full-screen decorative backgrounds. The pragmatic option if you don't need native composition or top performance.
2. **Pre-rendered video / Lottie / animated WebP** — record the Paper shader on the web, ship the asset. Smallest effort, no runtime parameters.
3. **RN-Skia built-ins** (`LinearGradient`, `FractalNoise`, `Turbulence`, …) — reproduce several of Paper's simpler gradient/noise effects without custom SkSL.

The native port earns its keep only when you need runtime-parameterised, composable, 60fps procedural effects inside a native view tree — primarily the procedural shaders (dithering, warp, neuro-noise, voronoi, …).

No pre-existing public port of Paper's shaders to React Native was found at the time (May 2026); Paper's team ships web-only.

## Architecture decisions

- **Bun-workspaces monorepo**: the shaders live in `packages/shaders` (the `react-native-paper-shaders` library, source-only — Metro compiles the TS directly); the gallery app lives in `apps/gallery` and imports the library.
- **One `.sksl.ts` + one `.tsx` per shader** under `packages/shaders/src/shaders/`, registered in `packages/shaders/src/shaders/registry.ts` (exported from the library) which drives the gallery (`apps/gallery/src/screens/`).
- **Prop API mirrors Paper exactly** (names, defaults from Paper's `defaultPreset`), so exported snippets translate mechanically. Only `style` differs: callers must use RN conventions (numeric sizes, `borderWidth`/`borderColor` instead of CSS strings/`outline`) — a deliberate decision over shipping a CSS-string adapter.
- **Time driving**: Reanimated `useFrameCallback` advances a `SharedValue` on the UI thread by `delta × speed`, seeded from the `frame` prop (milliseconds, matching Paper's convention; `u_time` is seconds = frame×0.001). No per-frame React re-renders.
- **Paper's vertex-shader sizing logic** (originX/Y, worldWidth/Height, fit, rotation, offsets) is folded into a fragment-stage helper (`paperComputeUVs` in `shader-utils.sksl.ts`) since SkSL runtime effects have no vertex stage.
- `u_resolution` is passed in **device pixels** with `u_pixelRatio`; every shader's `main()` starts with `fragCoord *= u_pixelRatio` because SkSL's fragCoord is in logical points while Paper's `gl_FragCoord` math expects device pixels.

## GLSL → SkSL gotchas discovered (the reusable knowledge)

Each of these caused a real compile failure during the port:

1. `#define` is rejected → use `const float`.
2. Array initializers (`const int a[N] = int[N](…)`) are rejected → unrolled chained-if lookup functions.
3. No `gl_FragCoord` → `vec4 main(vec2 fragCoord)`; logical-point units (see above).
4. No `#version` / `precision` / `in` / `out` — entry returns the color.
5. `ivec2` → `int2` (though `vec2/3/4` aliases work).
6. Integer `%` operator rejected → `mod()` on floats or `a - (a/b)*b`.
7. `clamp(int, int, int)` has no overload → cast through float.
8. **No derivatives** (`fwidth`, `dFdx`, `dFdy`) in runtime effects → constant epsilons (anti-aliasing quality loss).
9. `transpose(mat2)` unsupported → manual element swizzle.
10. `round()` unsupported → `floor(x + 0.5)`.
11. **No dynamic indexing into uniform arrays** (`u_colors[i]` where `i` is a loop var) → individual `u_color0…u_colorN` uniforms + a `pickColor(int)` chained-if helper.
12. (Tooling) Backticks inside SkSL comments close the JS template literal that wraps the source.

## Known limitations / degradations vs Paper

- **Texture-dependent shaders are stubbed**: `image-dithering`, `fluted-glass`, `heatmap` (and the image modes of `water`, `gem-smoke`, `liquid-metal`, `paper-texture`) expect a `sampler2D` input image. Image lookups were replaced with procedural gradient/noise stand-ins so each shader still renders coherently. Wiring a real Skia `ImageShader` through is the natural follow-up.
- **Noise-texture sampling replaced**: Paper samples a curated pre-computed noise PNG (`textureRandomizerR/GB`); we use procedural `hash21`/`hash22`/`valueNoise21`. Same statistical character, different exact pixels.
- **Derivative-based anti-aliasing and stretch-dampening lost** (gotcha #8) — slightly harder edges, and `gem-smoke`'s swirl is less stretch-adaptive.
- Visual parity for the fully-procedural shaders (dithering, warp, voronoi, spiral, etc.) is essentially exact.

## How it was built

Scaffolded as an Expo (SDK 56) TypeScript app with `@shopify/react-native-skia`, `react-native-reanimated` (+ `react-native-worklets`), and `@react-navigation/native-stack`. Dithering was ported by hand first to establish the template; the remaining 28 were ported in five parallel agent batches against that template, then a cleanup pass fixed the SkSL incompatibilities above. Verified on the iOS Simulator (dev client via `npx expo run:ios`; Expo Go does not support the native modules).
