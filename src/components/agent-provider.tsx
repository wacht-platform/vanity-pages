"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSessionAgents } from "@wacht/nextjs";
import { AgentWithIntegrations } from "@wacht/types";

interface ActiveAgentContextType {
    activeAgent: AgentWithIntegrations | null;
    setActiveAgent: (agent: AgentWithIntegrations) => void;
    agents: AgentWithIntegrations[];
    loading: boolean;
}

const ActiveAgentContext = createContext<ActiveAgentContextType | undefined>(undefined);

export function ActiveAgentProvider({ children }: { children: React.ReactNode }) {
    const { agents, loading } = useSessionAgents();
    const [activeAgent, setActiveAgent] = useState<AgentWithIntegrations | null>(null);

    // Auto-select first agent
    useEffect(() => {
        if (!activeAgent && agents.length > 0) {
            setActiveAgent(agents[0]);
        }
    }, [agents, activeAgent]);

    return (
        <ActiveAgentContext.Provider value={{ activeAgent, setActiveAgent, agents, loading }}>
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
