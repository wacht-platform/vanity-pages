"use client";

import React, { createContext, useContext } from "react";
import { useAgentSession } from "@wacht/nextjs";
import { AgentWithIntegrations } from "@wacht/types";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ActiveAgentContextType {
    activeAgent: AgentWithIntegrations | null;
    setActiveAgent: (agent: AgentWithIntegrations) => void;
    agents: AgentWithIntegrations[];
    loading: boolean;
    hasSession: boolean;
    sessionError: Error | null;
    sessionId: string | null;
    contextGroup: string | null;
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
        contextGroup,
        agents,
        activeAgent,
        setActiveAgent,
        ticketExchanged
    } = useAgentSession(ticket);

    useEffect(() => {
        if (ticket && ticketExchanged) {
            router.replace(pathname);
        }
    }, [ticket, ticketExchanged, router, pathname]);

    return (
        <ActiveAgentContext.Provider value={{
            activeAgent,
            setActiveAgent,
            agents,
            loading: sessionLoading,
            hasSession,
            sessionError,
            sessionId,
            contextGroup
        }}>
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
