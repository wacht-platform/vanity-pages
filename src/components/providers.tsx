"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DeploymentStyling } from "./deployment-styling";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <DeploymentStyling />
            {children}
        </ThemeProvider>
    );
}
