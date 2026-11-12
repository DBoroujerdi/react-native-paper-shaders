# react-native-paper-shaders

[Paper Design](https://app.paper.design)'s shader library ported to React Native, running natively via [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/) `RuntimeEffect` (SkSL). All 29 shaders from [`@paper-design/shaders-react`](https://github.com/paper-design/shaders), with the same prop API, animated on the UI thread at 60fps — no WebView, no WebGL.

> **Status: exploration, not production.** Unpublished, not tracked against Paper upstream, and a few shaders are knowingly degraded (see [Limitations](#limitations)). See the repo's `CONTEXT.md` for the full story and the GLSL→SkSL porting notes.

## Install

Not on npm — consume it from this workspace:

```jsonc
// package.json
"dependencies": {
  "react-native-paper-shaders": "workspace:*"
}
```

Peer dependencies (your app provides them):

- `react`, `react-native`
- `@shopify/react-native-skia`
- `react-native-reanimated`
- `react-native-worklets`

The package ships TypeScript source (`main: src/index.ts`); Metro compiles it directly. Native modules are required, so use a dev client (`expo run:ios` / `run:android`), not Expo Go.

## Usage

The prop API mirrors Paper's exactly (names and defaults from each shader's `defaultPreset`), so a snippet exported from the Paper editor translates mechanically — change the import path and convert the `style` to RN conventions:

```tsx
// Paper export (web)
import { Dithering } from '@paper-design/shaders-react';

<Dithering speed={0.25} shape="warp" type="4x4" size={4} scale={1}
  frame={5929.7} colorBack="#00000000" colorFront="#99CDFC"
  style={{ backgroundColor: '#E2ECF6', height: '319px', outline: '1px solid #B0D4F5', width: '511px' }} />

// React Native
import { Dithering } from 'react-native-paper-shaders';

<Dithering speed={0.25} shape="warp" type="4x4" size={4} scale={1}
  frame={5929.7} colorBack="#00000000" colorFront="#99CDFC"
  style={{ backgroundColor: '#E2ECF6', height: 319, width: 511,
    borderWidth: 1, borderColor: '#B0D4F5' }} />
```

`style` rules: numeric `width`/`height` are **required** (the component throws otherwise); use `borderWidth`/`borderColor` instead of CSS `outline`. Everything else is per-shader typed props — your editor's autocomplete on e.g. `DitheringProps` is the reference.

### Browsing the catalogue

`SHADERS` is a registry of every shader with its Paper default preset — it drives the gallery app in this repo and works for any browse/demo UI:

```tsx
import { SHADERS } from 'react-native-paper-shaders';

SHADERS.map(({ id, name, component: Shader, defaultProps }) => (
  <Shader key={id} {...defaultProps} style={{ width: 320, height: 140 }} />
));
```

### Authoring helpers

Building your own shader in the same style? The internals are exported:

- `makeShader(sksl, name)` — compile + cache an `SkRuntimeEffect`
- `useShaderTime(frame, speed)` — `u_time` as a Reanimated `SharedValue`, advanced on the UI thread
- `useShaderSize(style)` — width/height/dpr extraction
- `parseCssColor(input)` — CSS color string → `[r, g, b, a]` (0..1)

## Limitations

- **Texture-dependent shaders are stubbed**: `ImageDithering`, `FlutedGlass`, `Heatmap` (and the image modes of `Water`, `GemSmoke`, `LiquidMetal`, `PaperTexture`) replace image lookups with procedural stand-ins.
- **Noise texture sampling replaced** with procedural hashes — same statistical character, different exact pixels.
- **No derivative-based anti-aliasing** (SkSL runtime effects lack `fwidth`) — slightly harder edges.
- Fully-procedural shaders (Dithering, Warp, Voronoi, Spiral, …) are essentially pixel-exact vs Paper.

## Paper → RN playground

`apps/playground` is a static site that does the snippet conversion for you:
paste a Paper export, get the RN version (or a self-contained single-file
component), previewed live in the browser by CanvasKit — the same Skia that
RN-Skia wraps natively.

```sh
bun run playground         # dev server
bun run playground:build   # static bundle in apps/playground/dist
```

See `apps/playground/README.md` for the conversion rules it applies.

## Credit

All shader algorithms are ported from [`@paper-design/shaders`](https://github.com/paper-design/shaders) (MIT) by the Paper Design team. This package is an unaffiliated React Native port. MIT licensed.
