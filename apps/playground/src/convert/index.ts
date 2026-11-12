import { parse } from "@babel/parser";
import type { Plugin } from "prettier";
import generate from "@babel/generator";
import * as t from "@babel/types";
import * as prettier from "prettier/standalone";
import * as prettierBabel from "prettier/plugins/babel";
import * as prettierEstree from "prettier/plugins/estree";

import {
  BY_COMPONENT_NAME,
  PAPER_PACKAGES,
  TARGET_PACKAGE,
} from "../catalogue";
import { normalizeCssColor } from "./color";
import { convertStyle } from "./css";
import { evaluate } from "./literal";
import type { ConvertResult, DetectedShader, Warning } from "./types";

export type ConvertMode = "package" | "eject";

export type { ConvertResult, DetectedShader, Warning } from "./types";

const isColorProp = (name: string) => /^color/.test(name) || name === "colors";

/** A shader pulled in from Paper's package, with the local name the JSX uses. */
type ImportedShader = { imported: string; local: string };

function walk(node: unknown, visit: (n: t.Node) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const record = node as Record<string, unknown> & { type?: string };
  if (typeof record.type === "string") visit(record as unknown as t.Node);
  for (const key of Object.keys(record)) {
    if (key === "loc" || key.endsWith("Comments")) continue;
    walk(record[key], visit);
  }
}

function jsxName(node: t.JSXOpeningElement): string | null {
  const name = node.name;
  if (name.type === "JSXIdentifier") return name.name;
  return null;
}

/** Rewrites color props to hex, which is all the RN port's parser accepts. */
function normalizeColorAttribute(
  attr: t.JSXAttribute,
  propName: string,
  warn: (w: Warning) => void,
): unknown {
  const evaluated = evaluate(
    attr.value?.type === "JSXExpressionContainer"
      ? attr.value.expression
      : (attr.value as t.Node | null),
  );
  if (!evaluated.ok) return undefined;

  const convertOne = (input: unknown): unknown => {
    if (typeof input !== "string") return input;
    const hex = normalizeCssColor(input);
    if (!hex) {
      warn({
        level: "error",
        message: `\`${propName}='${input}'\` is not a color the port can parse — \`parseCssColor\` only reads hex, and throws otherwise.`,
      });
      return input;
    }
    if (hex !== input.trim()) {
      warn({ level: "info", message: `\`${propName}\`: '${input}' -> '${hex}'` });
    }
    return hex;
  };

  const value = Array.isArray(evaluated.value)
    ? evaluated.value.map(convertOne)
    : convertOne(evaluated.value);

  if (JSON.stringify(value) !== JSON.stringify(evaluated.value)) {
    attr.value =
      typeof value === "string"
        ? t.stringLiteral(value)
        : t.jsxExpressionContainer(t.valueToNode(value));
  }
  return value;
}

function convertElement(
  opening: t.JSXOpeningElement,
  componentName: string,
  warn: (w: Warning) => void,
): DetectedShader {
  const entry = BY_COMPONENT_NAME.get(componentName)!;
  const props: Record<string, unknown> = {};
  const unresolved: string[] = [];
  const scoped = (w: Warning) => warn({ ...w, component: componentName });

  for (const attr of opening.attributes) {
    if (attr.type === "JSXSpreadAttribute") {
      scoped({
        level: "warn",
        message: "spread props are passed through unchanged and are not previewed",
      });
      unresolved.push("...spread");
      continue;
    }
    const name = attr.name.type === "JSXIdentifier" ? attr.name.name : null;
    if (!name) continue;

    if (name === "style") {
      const expression =
        attr.value?.type === "JSXExpressionContainer" ? attr.value.expression : null;
      if (!expression) {
        scoped({
          level: "error",
          message: "`style` must be an object — RN has no CSS strings",
        });
        unresolved.push("style");
        continue;
      }
      const evaluated = evaluate(expression);
      if (!evaluated.ok || typeof evaluated.value !== "object" || evaluated.value === null) {
        scoped({
          level: "warn",
          message: `\`style\` could not be read statically (${evaluated.ok ? "not an object" : evaluated.reason}) — left as-is`,
        });
        unresolved.push("style");
        continue;
      }
      const { style, warnings } = convertStyle(evaluated.value as Record<string, unknown>);
      for (const w of warnings) scoped(w);
      attr.value = t.jsxExpressionContainer(t.valueToNode(style));
      props.style = style;
      continue;
    }

    if (name === "image") {
      scoped({
        level: "error",
        message: "`image` is not supported: the port replaces image sampling with a procedural stand-in.",
      });
      unresolved.push("image");
      continue;
    }

    const attrValue = attr.value;
    if (attrValue === null || attrValue === undefined) {
      // Valueless attribute, e.g. `inverted` -> `inverted={true}`.
      props[name] = true;
      continue;
    }

    if (isColorProp(name)) {
      const value = normalizeColorAttribute(attr, name, scoped);
      if (value === undefined) {
        unresolved.push(name);
      } else {
        props[name] = value;
      }
      continue;
    }

    const evaluated = evaluate(
      attrValue.type === "JSXExpressionContainer" ? attrValue.expression : attrValue,
    );
    if (evaluated.ok) {
      props[name] = evaluated.value;
    } else {
      unresolved.push(name);
      scoped({
        level: "info",
        message: `\`${name}\` (${evaluated.reason}) is passed through unchanged and is not previewed`,
      });
    }
  }

  if (entry.degraded) {
    scoped({ level: "warn", message: `${componentName}: ${entry.degraded}` });
  }

  return { id: entry.id, componentName, props, unresolved };
}

export async function convertSnippet(
  source: string,
  mode: ConvertMode = "package",
): Promise<ConvertResult> {
  const warnings: Warning[] = [];
  const warn = (w: Warning) => warnings.push(w);

  const ast = parse(source, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  });

  // Local name -> imported name, for shaders imported under an alias.
  const aliases = new Map<string, string>();
  const imported: ImportedShader[] = [];
  const paperImports: t.ImportDeclaration[] = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    if (!PAPER_PACKAGES.includes(statement.source.value)) continue;
    paperImports.push(statement);
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier") {
        warn({
          level: "warn",
          message: "only named imports from Paper's package can be converted",
        });
        continue;
      }
      const name =
        specifier.imported.type === "Identifier"
          ? specifier.imported.name
          : specifier.imported.value;
      aliases.set(specifier.local.name, name);
      if (BY_COMPONENT_NAME.has(name)) {
        imported.push({ imported: name, local: specifier.local.name });
      } else {
        warn({
          level: "error",
          message: `\`${name}\` has no port in ${TARGET_PACKAGE}.`,
        });
      }
    }
  }

  const shaders: DetectedShader[] = [];
  const used = new Set<string>();
  const domElements = new Set<string>();

  walk(ast.program, (node) => {
    if (node.type !== "JSXOpeningElement") return;
    const local = jsxName(node);
    if (!local) return;
    const componentName = aliases.get(local) ?? local;
    if (!BY_COMPONENT_NAME.has(componentName)) {
      if (/^[a-z]/.test(local)) domElements.add(local);
      return;
    }
    used.add(componentName);
    shaders.push(convertElement(node, componentName, warn));
  });

  if (domElements.size > 0) {
    warn({
      level: "warn",
      message: `HTML elements (${[...domElements].map((e) => `<${e}>`).join(", ")}) are left untouched — React Native has no DOM; wrap the shader in a \`<View>\` instead.`,
    });
  }

  if (shaders.length === 0) {
    warn({
      level: "error",
      message: "No Paper shader element found. Paste a snippet from Paper's editor, e.g. `<Dithering … />`.",
    });
  }

  // Rewrite (or synthesise) the imports, keeping any local aliases intact so
  // the JSX below still refers to a name that exists.
  for (const componentName of used) {
    if (!imported.some((entry) => entry.imported === componentName)) {
      imported.push({ imported: componentName, local: componentName });
    }
  }

  const specifier = ({ imported: name, local }: ImportedShader) =>
    t.importSpecifier(t.identifier(local), t.identifier(name));

  const declarations =
    mode === "eject"
      ? // One file per shader, so only emit what the snippet actually renders.
        imported
          .filter((entry) => used.has(entry.imported))
          .map((entry) =>
            t.importDeclaration([specifier(entry)], t.stringLiteral(`./${entry.imported}`)),
          )
      : imported.length > 0
        ? [
            t.importDeclaration(
              imported.map(specifier),
              t.stringLiteral(TARGET_PACKAGE),
            ),
          ]
        : [];

  if (paperImports.length > 0) {
    const index = ast.program.body.indexOf(paperImports[0]!);
    ast.program.body.splice(index, 0, ...declarations);
    ast.program.body = ast.program.body.filter(
      (statement) => !paperImports.includes(statement as t.ImportDeclaration),
    );
  } else {
    ast.program.body.unshift(...declarations);
  }

  const generated = generate(ast, { jsescOption: { minimal: true } }, source).code;
  const code = await format(blankLineAfterImports(generated));
  return { code, warnings, shaders };
}

/** @babel/generator collapses the blank line the import block deserves. */
function blankLineAfterImports(code: string): string {
  const lines = code.split("\n");
  let last = -1;
  for (const [index, line] of lines.entries()) {
    if (line.startsWith("import ")) last = index;
    else if (line.trim() !== "" && last !== -1) break;
  }
  if (last === -1 || lines[last + 1]?.trim() === "") return code;
  lines.splice(last + 1, 0, "");
  return lines.join("\n");
}

export async function format(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: "babel-ts",
      plugins: [prettierBabel as Plugin, prettierEstree as unknown as Plugin],
      semi: true,
      singleQuote: false,
    });
  } catch {
    return code;
  }
}
