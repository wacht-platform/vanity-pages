"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { xml } from "@codemirror/lang-xml";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";

function getCodeExtensions(path: string, mimeType?: string) {
    const normalizedPath = path.toLowerCase();
    const normalizedMime = (mimeType || "").toLowerCase();

    if (
        normalizedPath.endsWith(".ts") ||
        normalizedPath.endsWith(".tsx") ||
        normalizedPath.endsWith(".mts") ||
        normalizedPath.endsWith(".cts")
    ) {
        return [javascript({ typescript: true, jsx: normalizedPath.endsWith("x") })];
    }

    if (
        normalizedPath.endsWith(".js") ||
        normalizedPath.endsWith(".jsx") ||
        normalizedPath.endsWith(".mjs") ||
        normalizedPath.endsWith(".cjs")
    ) {
        return [javascript({ jsx: normalizedPath.endsWith("x") })];
    }

    if (
        normalizedPath.endsWith(".json") ||
        normalizedPath.endsWith(".jsonc") ||
        normalizedMime.includes("json")
    ) {
        return [json()];
    }

    if (
        normalizedPath.endsWith(".html") ||
        normalizedPath.endsWith(".htm") ||
        normalizedMime.includes("html")
    ) {
        return [html()];
    }

    if (
        normalizedPath.endsWith(".css") ||
        normalizedPath.endsWith(".scss") ||
        normalizedPath.endsWith(".less") ||
        normalizedMime.includes("css")
    ) {
        return [css()];
    }

    if (
        normalizedPath.endsWith(".xml") ||
        normalizedPath.endsWith(".svg") ||
        normalizedMime.includes("xml")
    ) {
        return [xml()];
    }

    if (normalizedPath.endsWith(".py") || normalizedMime.includes("python")) {
        return [python()];
    }

    if (normalizedPath.endsWith(".rs") || normalizedMime.includes("rust")) {
        return [rust()];
    }

    if (normalizedPath.endsWith(".sql") || normalizedMime.includes("sql")) {
        return [sql()];
    }

    if (
        normalizedPath.endsWith(".yaml") ||
        normalizedPath.endsWith(".yml") ||
        normalizedMime.includes("yaml")
    ) {
        return [yaml()];
    }

    return [];
}

export function CodeFileViewer({
    path,
    mimeType,
    value,
}: {
    path: string;
    mimeType?: string;
    value: string;
}) {
    const extensions = useMemo(
        () => getCodeExtensions(path, mimeType),
        [mimeType, path],
    );

    return (
        <div className="overflow-hidden">
            <CodeMirror
                value={value}
                theme={oneDark}
                extensions={extensions}
                editable={false}
                readOnly
                basicSetup={{
                    autocompletion: false,
                    foldGutter: true,
                    highlightActiveLine: false,
                    highlightActiveLineGutter: false,
                    lineNumbers: true,
                }}
            />
        </div>
    );
}
