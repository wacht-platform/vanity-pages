"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DeploymentTheme } from "@/components/deployment-theme";
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
            {/* Emits the deployment's theme_tokens as `--wa-*` CSS variables
                (globals.css maps shadcn's tokens onto them). */}
            <DeploymentTheme />
            {children}
        </ThemeProvider>
    );
}
