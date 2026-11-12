import { useCallback, useEffect, useMemo, useState } from "react";

import { BY_COMPONENT_NAME, CATALOGUE } from "./catalogue";
import { convertSnippet } from "./convert";
import { ejectShader, type EjectedFile } from "./convert/eject";
import type { ConvertResult, Warning } from "./convert/types";
import { DITHERING_EXAMPLE, makeExample } from "./examples";
import { Preview } from "./preview/Preview";

type Tab = "preview" | "snippet" | "eject";

const LEVEL_ORDER: Record<Warning["level"], number> = {
  error: 0,
  warn: 1,
  info: 2,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function Warnings({ warnings }: { warnings: Warning[] }) {
  const sorted = useMemo(
    () =>
      [...warnings].sort(
        (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level],
      ),
    [warnings],
  );

  if (sorted.length === 0) {
    return <p className="clean">Converted with nothing to flag.</p>;
  }

  return (
    <ul className="warnings">
      {sorted.map((warning, index) => (
        <li key={index} className={`level-${warning.level}`}>
          <span className="badge">{warning.level}</span>
          {warning.component ? <code>{warning.component}</code> : null}
          <span>
            {warning.message.split("`").map((part, partIndex) =>
              partIndex % 2 === 1 ? (
                <code key={partIndex}>{part}</code>
              ) : (
                part
              ),
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function App() {
  const [source, setSource] = useState(DITHERING_EXAMPLE);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [ejected, setEjected] = useState<{
    snippet: string;
    files: EjectedFile[];
  } | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      convertSnippet(source, "package").then(
        (next) => {
          if (cancelled) return;
          setResult(next);
          setFailure(null);
        },
        (cause: unknown) => {
          if (cancelled) return;
          setResult(null);
          setFailure(cause instanceof Error ? cause.message : String(cause));
        },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source]);

  const [selected, setSelected] = useState(0);
  const shader = result?.shaders[Math.min(selected, (result.shaders.length || 1) - 1)];

  const usedComponents = useMemo(
    () => [...new Set((result?.shaders ?? []).map((entry) => entry.componentName))],
    [result],
  );

  useEffect(() => {
    if (tab !== "eject" || usedComponents.length === 0) {
      setEjected(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [snippet, files] = await Promise.all([
        convertSnippet(source, "eject").then((next) => next.code),
        Promise.all(
          usedComponents.map((componentName) =>
            ejectShader(
              componentName,
              BY_COMPONENT_NAME.get(componentName)?.name ?? componentName,
            ),
          ),
        ),
      ]);
      if (!cancelled) setEjected({ snippet, files });
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, usedComponents, source]);

  const loadExample = useCallback((id: string) => {
    const entry = CATALOGUE.find((candidate) => candidate.id === id);
    if (entry) setSource(makeExample(entry));
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Paper → React Native</h1>
        <p>
          Paste a shader snippet exported from{" "}
          <a href="https://app.paper.design">Paper</a> and get the{" "}
          <code>react-native-paper-shaders</code> version, previewed with the
          same Skia that runs it on device.
        </p>
      </header>

      <main>
        <section className="pane">
          <div className="pane-head">
            <h2>Paper snippet</h2>
            <select
              defaultValue=""
              onChange={(event) => {
                loadExample(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                load an example…
              </option>
              {CATALOGUE.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </section>

        <section className="pane">
          <div className="pane-head">
            <nav className="tabs">
              {(
                [
                  ["preview", "Preview"],
                  ["snippet", "React Native"],
                  ["eject", "Self-contained"],
                ] as Array<[Tab, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={tab === value ? "active" : ""}
                  onClick={() => setTab(value)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "snippet" && result ? <CopyButton text={result.code} /> : null}
            {tab === "eject" && ejected?.files.length === 1 ? (
              <CopyButton text={ejected.files[0]!.code} />
            ) : null}
          </div>

          <div className="output">
            {failure ? <pre className="sksl-error">{failure}</pre> : null}

            {tab === "preview" ? (
              shader ? (
                <div className="stage">
                  {(result?.shaders.length ?? 0) > 1 ? (
                    <nav className="tabs">
                      {result!.shaders.map((entry, index) => (
                        <button
                          key={`${entry.componentName}-${index}`}
                          type="button"
                          className={shader === entry ? "active" : ""}
                          onClick={() => setSelected(index)}
                        >
                          {entry.componentName}
                        </button>
                      ))}
                    </nav>
                  ) : null}
                  <Preview shader={shader} />
                  <p className="stage-note">
                    {shader.componentName} · rendered by CanvasKit from the
                    component's own SkSL
                  </p>
                </div>
              ) : (
                <p className="clean">Nothing to preview yet.</p>
              )
            ) : null}

            {tab === "snippet" && result ? (
              <pre className="code">{result.code}</pre>
            ) : null}

            {tab === "eject" ? (
              ejected ? (
                <>
                  <p className="clean">
                    Drop{" "}
                    {ejected.files.map((file, index) => (
                      <span key={file.filename}>
                        {index > 0 ? " and " : null}
                        <code>{file.filename}</code>
                      </span>
                    ))}{" "}
                    into your project — no library dependency, just the native
                    peers.
                  </p>
                  <pre className="code">{ejected.snippet}</pre>
                  {ejected.files.map((file) => (
                    <div key={file.filename} className="file-block">
                      <div className="file-head">
                        <code>{file.filename}</code>
                        <CopyButton text={file.code} />
                      </div>
                      <pre className="code file">{file.code}</pre>
                    </div>
                  ))}
                </>
              ) : (
                <p className="clean">Flattening the component…</p>
              )
            ) : null}
          </div>
        </section>
      </main>

      <footer>
        <h2>Notes</h2>
        {result ? <Warnings warnings={result.warnings} /> : null}
      </footer>
    </div>
  );
}
