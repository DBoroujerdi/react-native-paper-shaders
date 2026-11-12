import type { CanvasKit } from "canvaskit-wasm";
import { useEffect, useRef, useState } from "react";

import { loadCanvasKit } from "./canvaskit";
import { onDraw } from "./clock";
import type { UniformValues } from "./shims/skia";

type Props = {
  width: number;
  height: number;
  sksl: string;
  uniforms: { value: UniformValues };
};

type UniformSlot = {
  name: string;
  slot: number;
  count: number;
  isInteger: boolean;
};

/**
 * Compiles the component's SkSL with CanvasKit and repaints it every frame with
 * the uniforms the component derives — the browser-side equivalent of RN-Skia's
 * <Canvas><Fill><Shader/></Fill></Canvas>.
 *
 * The canvas is scaled by the device pixel ratio and the rect is drawn in
 * logical points, matching RN-Skia's coordinate space (each shader multiplies
 * fragCoord by u_pixelRatio itself).
 */
export function SkslCanvas({ width, height, sksl, uniforms }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;

  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    loadCanvasKit().then(setCanvasKit, (cause: unknown) => setError(String(cause)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvasKit || !canvas || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const compileErrors: string[] = [];
    const effect = canvasKit.RuntimeEffect.Make(sksl, (message) =>
      compileErrors.push(message),
    );
    if (!effect) {
      setError(compileErrors.join("\n") || "SkSL failed to compile.");
      return;
    }

    const surface = canvasKit.MakeWebGLCanvasSurface(canvas);
    if (!surface) {
      setError("Could not create a WebGL surface for the preview.");
      effect.delete();
      return;
    }

    setError(null);
    const layout: UniformSlot[] = Array.from(
      { length: effect.getUniformCount() },
      (_, index) => {
        const uniform = effect.getUniform(index);
        return {
          name: effect.getUniformName(index),
          slot: uniform.slot,
          count: uniform.columns * uniform.rows,
          isInteger: uniform.isInteger,
        };
      },
    );

    const floats = new Float32Array(effect.getUniformFloatCount());
    const ints = new Int32Array(floats.buffer);
    const paint = new canvasKit.Paint();
    const rect = canvasKit.LTRBRect(0, 0, width, height);
    let reportedMissing = false;

    const draw = () => {
      const values = uniformsRef.current.value ?? {};
      const absent: string[] = [];
      for (const uniform of layout) {
        const value = values[uniform.name];
        if (value === undefined) {
          absent.push(uniform.name);
          continue;
        }
        const numbers = typeof value === "number" ? [value] : value;
        for (let i = 0; i < uniform.count; i++) {
          const scalar = Number(numbers[i] ?? 0);
          if (uniform.isInteger) ints[uniform.slot + i] = scalar;
          else floats[uniform.slot + i] = scalar;
        }
      }
      if (!reportedMissing) {
        reportedMissing = true;
        if (absent.length > 0) setMissing(absent);
      }

      const shader = effect.makeShader(floats);
      paint.setShader(shader);
      const skCanvas = surface.getCanvas();
      skCanvas.clear(canvasKit.TRANSPARENT);
      skCanvas.save();
      skCanvas.scale(dpr, dpr);
      skCanvas.drawRect(rect, paint);
      skCanvas.restore();
      surface.flush();
      shader.delete();
    };

    const stop = onDraw(draw);
    return () => {
      stop();
      paint.delete();
      surface.delete();
      effect.delete();
    };
  }, [canvasKit, sksl, width, height]);

  if (error) {
    return (
      <pre className="sksl-error" style={{ width, minHeight: height }}>
        {error}
      </pre>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width, height, display: "block" }}
        aria-label="shader preview"
      />
      {missing.length > 0 ? (
        <p className="sksl-note">
          Uniforms not supplied by the component (rendered as 0):{" "}
          {missing.join(", ")}
        </p>
      ) : null}
    </>
  );
}
