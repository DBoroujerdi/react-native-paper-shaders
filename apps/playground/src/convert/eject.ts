import { parse } from "@babel/parser";
import type * as t from "@babel/types";

import { format } from "./index";
import { LIBRARY_SOURCES, resolveLibraryPath } from "./sources";

/**
 * Flattens a shader component and everything it imports from the library into a
 * single file, the way SVGR hands you a component instead of a dependency.
 * External imports (react, react-native, RN-Skia, Reanimated) are merged and
 * re-emitted; local ones are inlined.
 */
export type EjectedFile = { filename: string; code: string };

type Parsed = {
  path: string;
  body: string;
  locals: string[];
  externals: Map<string, { values: string[]; types: string[] }>;
};

const MODULE_ORDER = [
  "react",
  "react-native",
  "@shopify/react-native-skia",
  "react-native-reanimated",
];

function parseFile(path: string, keepExports: boolean): Parsed {
  const source = LIBRARY_SOURCES[path]!;
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const cuts: Array<[number, number]> = [];
  const locals: string[] = [];
  const externals = new Map<string, { values: string[]; types: string[] }>();

  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration") {
      cuts.push([statement.start!, statement.end!]);
      const from = statement.source.value;
      if (from.startsWith(".")) {
        const resolved = resolveLibraryPath(path, from);
        if (resolved) locals.push(resolved);
        continue;
      }
      const bucket = externals.get(from) ?? { values: [], types: [] };
      for (const specifier of statement.specifiers) {
        if (specifier.type === "ImportSpecifier") {
          const name =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;
          const alias =
            specifier.local.name === name ? name : `${name} as ${specifier.local.name}`;
          const isType =
            statement.importKind === "type" || specifier.importKind === "type";
          (isType ? bucket.types : bucket.values).push(alias);
        } else if (specifier.type === "ImportDefaultSpecifier") {
          bucket.values.push(`default as ${specifier.local.name}`);
        }
      }
      externals.set(from, bucket);
      continue;
    }

    if (!keepExports && statement.type === "ExportNamedDeclaration") {
      if (statement.declaration) {
        // Drop just the `export ` keyword; the declaration itself stays.
        cuts.push([statement.start!, statement.declaration.start!]);
      } else {
        cuts.push([statement.start!, statement.end!]);
      }
    }
  }

  let body = "";
  let cursor = 0;
  for (const [start, end] of cuts.sort((a, b) => a[0] - b[0])) {
    body += source.slice(cursor, start);
    cursor = end;
  }
  body += source.slice(cursor);

  return { path, body: body.trim(), locals, externals };
}

/** Depth-first over local imports so dependencies are emitted before their users. */
function collect(entry: string): Parsed[] {
  const ordered: Parsed[] = [];
  const seen = new Set<string>();

  const visit = (path: string, isEntry: boolean) => {
    if (seen.has(path)) return;
    seen.add(path);
    const parsed = parseFile(path, isEntry);
    for (const local of parsed.locals) visit(local, false);
    ordered.push(parsed);
  };

  visit(entry, true);
  return ordered;
}

function renderImports(files: Parsed[]): string {
  const merged = new Map<string, { values: Set<string>; types: Set<string> }>();
  for (const file of files) {
    for (const [from, bucket] of file.externals) {
      const target =
        merged.get(from) ?? { values: new Set<string>(), types: new Set<string>() };
      for (const value of bucket.values) target.values.add(value);
      for (const type of bucket.types) target.types.add(type);
      merged.set(from, target);
    }
  }

  const modules = [...merged.keys()].sort((a, b) => {
    const ai = MODULE_ORDER.indexOf(a);
    const bi = MODULE_ORDER.indexOf(b);
    return (ai === -1 ? MODULE_ORDER.length : ai) - (bi === -1 ? MODULE_ORDER.length : bi);
  });

  const lines: string[] = [];
  for (const from of modules) {
    const bucket = merged.get(from)!;
    const values = [...bucket.values].filter((name) => !bucket.types.has(name));
    if (values.length > 0) {
      lines.push(`import { ${values.join(", ")} } from "${from}";`);
    }
    if (bucket.types.size > 0) {
      lines.push(`import type { ${[...bucket.types].join(", ")} } from "${from}";`);
    }
  }
  return lines.join("\n");
}

export async function ejectShader(
  componentName: string,
  shaderName: string,
): Promise<EjectedFile> {
  const entry = `shaders/${componentName}.tsx`;
  if (LIBRARY_SOURCES[entry] === undefined) {
    throw new Error(`No source for ${entry}`);
  }
  const files = collect(entry);

  const header = [
    `// ${componentName} — Paper's "${shaderName}" shader, ported to React Native and`,
    `// flattened into one file: SkSL source, uniform plumbing and the component.`,
    `//`,
    `// Generated from react-native-paper-shaders (MIT). The shader algorithm is`,
    `// ported from @paper-design/shaders (MIT) by the Paper Design team.`,
    `//`,
    `// Requires: @shopify/react-native-skia, react-native-reanimated and`,
    `// react-native-worklets. These are native modules — run a dev client`,
    `// (expo run:ios / run:android), not Expo Go.`,
  ].join("\n");

  const sections = files
    .map((file) => `// ${"—".repeat(4)} ${file.path} ${"—".repeat(Math.max(0, 60 - file.path.length))}\n\n${file.body}`)
    .join("\n\n");

  const code = `${header}\n\n${renderImports(files)}\n\n${sections}\n`;
  return { filename: `${componentName}.tsx`, code: await format(code) };
}
