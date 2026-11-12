export type WarningLevel = "error" | "warn" | "info";

export type Warning = {
  level: WarningLevel;
  message: string;
  /** Shader component the warning belongs to, when it is element-specific. */
  component?: string;
};

export type DetectedShader = {
  /** Registry id, e.g. "dithering". */
  id: string;
  /** PascalCase component name, e.g. "Dithering". */
  componentName: string;
  /** Statically evaluated props, ready to spread onto the RN component. */
  props: Record<string, unknown>;
  /** Props whose values could not be evaluated (variables, calls, spreads). */
  unresolved: string[];
};

export type ConvertResult = {
  /** The converted snippet, formatted. */
  code: string;
  warnings: Warning[];
  /** One entry per Paper shader element found, in source order. */
  shaders: DetectedShader[];
};
