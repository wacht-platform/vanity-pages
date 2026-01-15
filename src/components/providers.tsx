"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DeploymentProvider } from "@wacht/nextjs";
import { ActiveAgentProvider } from "./agent-provider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    // Get public key from environment variable

    return (
        <ActiveAgentProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </ActiveAgentProvider>
    );
}
