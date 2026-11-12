import type { CanvasKit } from "canvaskit-wasm";
// Served from node_modules by Vite, so the built site has no CDN dependency.
import canvasKitJsUrl from "canvaskit-wasm/bin/full/canvaskit.js?url";
import canvasKitWasmUrl from "canvaskit-wasm/bin/full/canvaskit.wasm?url";

let pending: Promise<CanvasKit> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/** Loads (once) the same Skia build that react-native-skia wraps natively. */
export function loadCanvasKit(): Promise<CanvasKit> {
  pending ??= (async () => {
    await loadScript(canvasKitJsUrl);
    const init = (window as unknown as {
      CanvasKitInit?: (opts: { locateFile: () => string }) => Promise<CanvasKit>;
    }).CanvasKitInit;
    if (!init) throw new Error("CanvasKit failed to register itself");
    return init({ locateFile: () => canvasKitWasmUrl });
  })();
  return pending;
}
