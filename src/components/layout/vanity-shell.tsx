"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VanityNavItem = {
    value: string;
    label: string;
    href: string;
};

type VanityShellProps = {
    brand?: {
        icon: React.ReactNode;
        title: string;
        subtitle?: string;
    };
    navItems: VanityNavItem[];
    activeNavValue: string;
    children: React.ReactNode;
    rightSlot?: React.ReactNode;
};

export function useIframeThemeSync() {
    const { setTheme } = useTheme();

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        // Initial theme from the query string (?theme=light|dark) — the console
        // host sets it so the first paint matches without a flash.
        try {
            const qp = new URLSearchParams(window.location.search).get("theme");
            if (qp === "light" || qp === "dark") setTheme(qp);
        } catch {
            // ignore malformed search params
        }

        if (window.parent === window) return;

        function onMessage(event: MessageEvent) {
            const data = event.data;
            if (!data || typeof data !== "object") return;
            if (data.type !== "wacht:theme") return;
            const theme = data.theme;
            if (theme === "light" || theme === "dark" || theme === "system") {
                setTheme(theme);
            }
        }

        window.addEventListener("message", onMessage);
        try {
            window.parent.postMessage({ type: "wacht:ready" }, "*");
        } catch {
            // cross-origin parent; safe to ignore
        }
        return () => window.removeEventListener("message", onMessage);
    }, [setTheme]);
}

function ThemeToggleButton() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === "dark";

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
            <Sun
                className={cn(
                    "h-4 w-4 transition-all",
                    isDark ? "scale-0 rotate-90" : "scale-100 rotate-0",
                )}
            />
            <Moon
                className={cn(
                    "absolute h-4 w-4 transition-all",
                    isDark ? "scale-100 rotate-0" : "scale-0 -rotate-90",
                )}
            />
        </Button>
    );
}

export function VanityShell({
    brand,
    navItems,
    activeNavValue,
    children,
    rightSlot,
}: VanityShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-background">
                <div className="mx-auto flex h-[56px] w-full max-w-7xl items-center gap-1 px-4 md:px-6">
                    {brand && (
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                {brand.icon}
                            </div>
                            <div className="min-w-0 leading-tight">
                                <div className="truncate text-sm font-semibold text-foreground">
                                    {brand.title}
                                </div>
                                {brand.subtitle ? (
                                    <div className="truncate text-[11px] text-muted-foreground">
                                        {brand.subtitle}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {navItems.length > 0 ? (
                        <nav className="hidden md:block">
                            <Tabs value={activeNavValue}>
                                <TabsList className="h-auto gap-1 rounded-none bg-transparent p-0">
                                    {navItems.map((item) => (
                                        <TabsTrigger
                                            key={item.value}
                                            value={item.value}
                                            asChild
                                            className="h-[30px] flex-none rounded-[6px] border-0 px-3.5 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_0_0.5px_var(--border),0_1px_2px_rgba(0,0,0,0.04)]"
                                        >
                                            <Link href={item.href}>
                                                {item.label}
                                            </Link>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </nav>
                    ) : null}

                    <div className="ml-auto flex items-center gap-1.5">
                        {rightSlot}
                        <ThemeToggleButton />
                    </div>
                </div>

                {navItems.length > 0 ? (
                    <div className="md:hidden">
                        <div className="overflow-x-auto border-t border-border/40 px-4 py-2">
                            <Tabs value={activeNavValue}>
                                <TabsList>
                                    {navItems.map((item) => (
                                        <TabsTrigger
                                            key={item.value}
                                            value={item.value}
                                            asChild
                                        >
                                            <Link href={item.href}>
                                                {item.label}
                                            </Link>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                ) : null}
            </header>

            <main className="flex-1">{children}</main>
        </div>
    );
}

export { ThemeToggleButton as VanityThemeToggle };
