"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActors, useAgentSession } from "@wacht/nextjs";
import type { Actor, Agent } from "@wacht/types";

interface ActiveAgentContextType {
    agents: Agent[];
    actor: Actor | null;
    actorId: string | null;
    loading: boolean;
    hasSession: boolean;
    sessionError: Error | null;
    sessionId: string | null;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}

const ActiveAgentContext = createContext<ActiveAgentContextType | undefined>(undefined);

export function ActiveAgentProvider({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const ticket = searchParams?.get("ticket");

    const {
        hasSession,
        sessionLoading,
        sessionError,
        sessionId,
        actor,
        agents,
        ticketExchanged
    } = useAgentSession(ticket);
    const {
        actors,
        loading: actorsLoading,
    } = useActors({
        enabled: hasSession && !sessionLoading && !actor,
    });

    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const resolvedActor = actor ?? actors[0] ?? null;
    const loading = sessionLoading || (hasSession && !actor && actorsLoading);

    useEffect(() => {
        if (ticket && ticketExchanged) {
            router.replace(pathname);
        }
    }, [ticket, ticketExchanged, router, pathname]);

    const value = useMemo(
        () => ({
            agents,
            actor: resolvedActor,
            actorId: resolvedActor?.id ?? null,
            loading,
            hasSession,
            sessionError,
            sessionId,
            isSidebarCollapsed,
            setIsSidebarCollapsed,
        }),
        [
            agents,
            resolvedActor,
            loading,
            hasSession,
            sessionError,
            sessionId,
            isSidebarCollapsed,
        ],
    );

    return (
        <ActiveAgentContext.Provider value={value}>
            {children}
        </ActiveAgentContext.Provider>
    );
}

export function useActiveAgent() {
    const context = useContext(ActiveAgentContext);
    if (context === undefined) {
        throw new Error("useActiveAgent must be used within an ActiveAgentProvider");
    }
    return context;
}
