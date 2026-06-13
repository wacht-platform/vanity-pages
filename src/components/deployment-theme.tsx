"use client";

import { useDeployment } from "@wacht/nextjs";

/**
 * Emits the deployment's configured theme tokens as `--wa-*` CSS variables.
 *
 * The SDK's own token stylesheet is injected via styled-components, which
 * renders nothing during SSR — so instead of depending on it, we read the
 * deployment's `ui_settings.theme_tokens` (fully populated for every
 * deployment) and write the `--wa-*` variables ourselves, on :root (light)
 * and .dark (dark). globals.css maps shadcn's semantic tokens onto these at
 * :root, so the whole UI is themed from the deployment with no hardcoded
 * defaults here. (They must be on :root, not .wacht-root, so Tailwind's
 * `@theme` `--color-*: var(--<token>)` indirection resolves.)
 *
 * Rendered inside <DeploymentInitialized>, so the deployment is loaded before
 * any content paints — the variables are present on first render.
 *
 * Fonts (font_sans/font_mono) are intentionally skipped: vanity loads Geist
 * locally via next/font and maps `--wa-font-*` to it in globals.css.
 */
function toVars(map?: Record<string, string | undefined> | null): string {
    if (!map) return "";
    let out = "";
    for (const key in map) {
        if (key === "font_sans" || key === "font_mono") continue;
        const value = map[key];
        if (typeof value === "string" && value.trim() !== "") {
            out += `--wa-${key.replace(/_/g, "-")}:${value};`;
        }
    }
    return out;
}

export function DeploymentTheme() {
    const { deployment } = useDeployment();
    const tokens = deployment?.ui_settings?.theme_tokens;
    if (!tokens) return null;

    const light = toVars(
        tokens.light as Record<string, string | undefined> | undefined,
    );
    const dark = toVars(
        tokens.dark as Record<string, string | undefined> | undefined,
    );
    if (!light && !dark) return null;

    const css =
        (light ? `:root{${light}}` : "") +
        (dark ? `.dark{${dark}}` : "");

    return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
