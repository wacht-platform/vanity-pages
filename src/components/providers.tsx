"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DeploymentStyling } from "./deployment-styling";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            <DeploymentStyling />
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </>
    );
}
