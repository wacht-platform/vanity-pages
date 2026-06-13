"use client";

import * as React from "react";
import { DefaultStylesProvider } from "@wacht/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { useIframeThemeSync } from "@/components/layout/vanity-shell";

function ThemeSyncBridge() {
    useIframeThemeSync();
    return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            <ThemeSyncBridge />
            {/* Injects the SDK `--wa-*` token stylesheet and applies the
                deployment's theme_tokens as inline `--wa-ov-*` overrides. */}
            <DefaultStylesProvider>{children}</DefaultStylesProvider>
        </ThemeProvider>
    );
}
