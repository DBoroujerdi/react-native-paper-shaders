import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const shim = (name: string) =>
  fileURLToPath(new URL(`./src/preview/shims/${name}`, import.meta.url));

// The playground compiles `react-native-paper-shaders` straight from source and
// renders the *real* components in the browser. React Native, Reanimated and
// RN-Skia are swapped for the shims in src/preview/shims, which forward the
// component's SkSL + uniforms to CanvasKit (the same Skia that RN-Skia wraps).
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: shim("react-native.tsx") },
      { find: /^react-native-reanimated$/, replacement: shim("reanimated.ts") },
      { find: /^@shopify\/react-native-skia$/, replacement: shim("skia.tsx") },
    ],
  },
  optimizeDeps: {
    // Compiled from source in the workspace, not a prebundled dep.
    exclude: ["react-native-paper-shaders", "canvaskit-wasm"],
  },
});
