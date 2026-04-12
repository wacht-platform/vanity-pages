"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";

import { AgentNavbar } from "@/components/layout/agent-navbar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function AgentPageShell({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full flex-col overflow-hidden bg-background">
            <AgentNavbar
                left={
                    <h1 className="truncate text-sm font-normal text-foreground">
                        {title}
                    </h1>
                }
                right={actions}
            />
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full px-4 py-4 md:py-5">
                    {description ? (
                        <p className="mb-4 max-w-2xl text-sm leading-5 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                    {children}
                </div>
            </div>
        </div>
    );
}

export function AgentSearchInput({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div className={cn("relative w-full sm:w-[240px]", className)}>
            <IconSearch
                size={15}
                stroke={1.9}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            />
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="pl-9"
            />
        </div>
    );
}
