# Paper → React Native playground

A static SPA that converts a shader snippet exported from [Paper](https://app.paper.design)
into its `react-native-paper-shaders` equivalent — the same job
[react-svgr's playground](https://react-svgr.com/playground/) does for SVG.

```sh
bun run playground         # dev server on :5173
bun run playground:build   # static bundle in apps/playground/dist
```

The build is fully static (no server, no CDN — CanvasKit is bundled from
`node_modules`), so `dist/` can be dropped on GitHub Pages or any static host.
`base: "./"` in `vite.config.ts` keeps it working from a subpath.

## What it does

Three outputs from one pasted snippet:

1. **Preview** — the real library component, rendered in the browser. React
   Native, Reanimated and RN-Skia are aliased to the shims in
   `src/preview/shims/`, which forward the component's own SkSL and uniforms to
   [CanvasKit](https://skia.org/docs/user/modules/canvaskit/) — the same Skia
   that `@shopify/react-native-skia` wraps natively. So the preview exercises
   the ported shader, not a re-implementation of it, and a broken port shows up
   here as a real Skia compile error.
2. **React Native** — the converted snippet, importing from
   `react-native-paper-shaders`.
3. **Self-contained** — the shader component flattened into one file (SkSL,
   uniform plumbing, `parseCssColor`, enum maps), so a consumer can paste it in
   without depending on this unpublished library. Both generated files
   typecheck against the real RN/Skia/Reanimated types.

## The conversion (`src/convert/`)

| Input | Output | Why |
| --- | --- | --- |
| `@paper-design/shaders-react` | `react-native-paper-shaders` | aliases (`Dithering as Dots`) are preserved |
| `height: '319px'` | `height: 319` | the components throw without numeric `width`/`height` |
| `outline: '1px solid #B0D4F5'` | `borderWidth: 1, borderColor: '#B0D4F5'` | RN has no `outline` |
| `colorBack="rgba(0,0,0,.5)"` | `colorBack="#00000080"` | `parseCssColor` only reads hex, and throws otherwise |
| `margin: '8px 16px'` | per-side values | RN has no multi-value shorthand |
| `cursor`, `transition`, `background: linear-gradient(...)` | dropped, with a note | no RN equivalent |
| `width: '100%'`, `height: '50vh'` | flagged as an error | needs an `onLayout` measurement |

Everything the converter cannot decide is reported in the Notes panel instead of
being guessed at: `%`/`vh` sizes, props whose value is a variable, spread props,
and the shaders the port knowingly degrades (image-sampling ones — see the
library README's Limitations).

## Layout

```
src/convert/   literal evaluator, CSS→RN style rules, color normaliser,
               the JSX codemod, and the single-file ejector
src/preview/   the rAF clock, CanvasKit loader/renderer, and the RN shims
src/catalogue.ts   the 29 shaders, derived from the library's own registry
src/examples.ts    Paper-shaped example snippets built from each default preset
```

The catalogue comes from `SHADERS` in the library, so a shader added there shows
up here — in the example picker, the converter and the preview — with no edit.
