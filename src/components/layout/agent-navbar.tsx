"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function AgentNavbar({
    left,
    right,
    className,
}: {
    left?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cn(
                "flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background px-4",
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-3">{left}</div>
            <div className="flex shrink-0 items-center gap-2">{right}</div>
        </header>
    );
}
