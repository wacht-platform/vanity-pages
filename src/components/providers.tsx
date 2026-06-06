"use client";

import * as React from "react";
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
            {children}
        </ThemeProvider>
    );
}
