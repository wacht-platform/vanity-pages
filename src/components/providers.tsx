"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DeploymentStyling } from "./deployment-styling";
import { useIframeThemeSync } from "@/components/layout/vanity-shell";

function ThemeSyncBridge() {
    useIframeThemeSync();
    return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <ThemeSyncBridge />
            <DeploymentStyling />
            {children}
        </ThemeProvider>
    );
}
