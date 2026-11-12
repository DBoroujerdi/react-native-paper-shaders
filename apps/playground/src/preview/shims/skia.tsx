// Minimal stand-in for @shopify/react-native-skia. `Skia.RuntimeEffect.Make`
// just carries the SkSL text; <Canvas> finds the <Shader> element in its
// children and hands the source + live uniforms to CanvasKit — the same Skia
// that RN-Skia wraps natively.
import { Children, isValidElement, type ReactNode } from "react";

import { SkslCanvas } from "../SkslCanvas";
import { StyleSheet, type StyleProp, type ViewStyle } from "./react-native";

export type SkRuntimeEffect = { readonly sksl: string };

export const Skia = {
  RuntimeEffect: {
    // Real compilation (and error reporting) happens in SkslCanvas, where the
    // CanvasKit instance lives.
    Make: (sksl: string): SkRuntimeEffect => ({ sksl }),
  },
};

export type UniformValues = Record<string, number | number[]>;

export type ShaderProps = {
  source: SkRuntimeEffect;
  uniforms: { value: UniformValues };
};

export function Shader(_props: ShaderProps) {
  return null;
}

export function Fill(_props: { children?: ReactNode }) {
  return null;
}

function findShader(children: ReactNode): ShaderProps | null {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type === Shader) return child.props as ShaderProps;
    const nested = findShader((child.props as { children?: ReactNode }).children);
    if (nested) return nested;
  }
  return null;
}

export function Canvas({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const flat = StyleSheet.flatten(style);
  const shader = findShader(children);
  if (!shader) return null;
  return (
    <SkslCanvas
      width={Number(flat.width) || 0}
      height={Number(flat.height) || 0}
      sksl={shader.source.sksl}
      uniforms={shader.uniforms}
    />
  );
}
