import { Component, type ErrorInfo, type ReactNode } from "react";

import { BY_COMPONENT_NAME } from "../catalogue";
import type { DetectedShader } from "../convert/types";

class ShaderBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Shader preview failed", error, info);
  }

  render() {
    if (this.state.error) {
      return <pre className="sksl-error">{this.state.error.message}</pre>;
    }
    return this.props.children;
  }
}

/**
 * Renders the actual `react-native-paper-shaders` component, with React Native,
 * Reanimated and RN-Skia aliased to the shims in ./shims — so what you see is
 * the ported component's own SkSL and uniform plumbing, not a re-implementation.
 */
export function Preview({ shader }: { shader: DetectedShader }) {
  const entry = BY_COMPONENT_NAME.get(shader.componentName);
  if (!entry) return null;
  const Shader = entry.component;
  return (
    <ShaderBoundary key={JSON.stringify(shader.props)}>
      <Shader {...shader.props} />
    </ShaderBoundary>
  );
}
