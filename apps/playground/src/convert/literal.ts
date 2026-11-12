import type * as t from "@babel/types";

/**
 * Statically evaluates the literal subset of an expression — enough for the
 * props Paper's editor exports (numbers, strings, booleans, arrays of colors,
 * style objects). Anything else (identifiers, calls, member expressions) is
 * reported as unevaluable rather than guessed at.
 */
export type EvalResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

const fail = (reason: string): EvalResult => ({ ok: false, reason });

export function evaluate(node: t.Node | null | undefined): EvalResult {
  if (!node) return fail("missing value");

  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return { ok: true, value: node.value };
    case "NullLiteral":
      return { ok: true, value: null };
    case "Identifier":
      if (node.name === "undefined") return { ok: true, value: undefined };
      return fail(`\`${node.name}\` is a variable`);
    case "TemplateLiteral":
      if (node.expressions.length > 0) return fail("template interpolation");
      return { ok: true, value: node.quasis.map((q) => q.value.cooked).join("") };
    case "UnaryExpression": {
      const inner = evaluate(node.argument);
      if (!inner.ok) return inner;
      if (node.operator === "-" && typeof inner.value === "number") {
        return { ok: true, value: -inner.value };
      }
      if (node.operator === "+" && typeof inner.value === "number") {
        return { ok: true, value: inner.value };
      }
      if (node.operator === "!") return { ok: true, value: !inner.value };
      return fail(`unary \`${node.operator}\``);
    }
    case "ArrayExpression": {
      const out: unknown[] = [];
      for (const element of node.elements) {
        if (element === null) return fail("array hole");
        if (element.type === "SpreadElement") return fail("array spread");
        const item = evaluate(element);
        if (!item.ok) return item;
        out.push(item.value);
      }
      return { ok: true, value: out };
    }
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type !== "ObjectProperty") return fail("object spread or method");
        const key = propertyKey(prop);
        if (key === null) return fail("computed object key");
        const item = evaluate(prop.value as t.Node);
        if (!item.ok) return item;
        out[key] = item.value;
      }
      return { ok: true, value: out };
    }
    case "JSXExpressionContainer":
      return evaluate(node.expression as t.Node);
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
      return evaluate(node.expression);
    default:
      return fail(node.type);
  }
}

export function propertyKey(prop: t.ObjectProperty): string | null {
  if (prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "StringLiteral") return prop.key.value;
  if (prop.key.type === "NumericLiteral") return String(prop.key.value);
  return null;
}
