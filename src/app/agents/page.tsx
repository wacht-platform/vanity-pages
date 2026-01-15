"use client"

import { useExchangeTicket, useSessionAgents, useClient, useAgentContexts } from "@wacht/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { useActiveAgent } from "@/components/agent-provider";
import { useState, useEffect } from "react";
import { ChevronDown, ArrowUp, Plus, History, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AgentWithIntegrations } from "@wacht/types";

export default function AgentsLandingPage() {
    const searchParams = useSearchParams();
    const ticket = searchParams?.get("ticket");
    const router = useRouter();
    const { client } = useClient();

    const { exchanged, loading: authLoading, error: authError } = useExchangeTicket(ticket);

    useEffect(() => {
        if (exchanged && ticket) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("ticket");
            router.replace(newUrl.pathname + newUrl.search);
        }
    }, [exchanged, ticket, router]);

    const { activeAgent, setActiveAgent, agents, loading: agentsLoading } = useActiveAgent();
    const { createContext } = useAgentContexts();

    const [input, setInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const currentAgentId = activeAgent?.id || (agents.length > 0 ? agents[0].id : null);

        if (!input.trim() || isSubmitting || !currentAgentId) return;

        setIsSubmitting(true);
        try {
            const context = await createContext({
                title: input.trim().slice(0, 50) || "New Chat",
            });

            if (context?.id) {
                const formData = new FormData();
                if (activeAgent?.name) {
                    formData.append("agent_name", activeAgent.name);
                }
                formData.append("message", input.trim());

                await client(`/api/agent/contexts/${context.id}/execute`, {
                    method: "POST",
                    body: formData,
                });

                router.push(`/agents/c/${context.id}`);
            }
        } catch (e) {
            console.error("Failed to create chat", e);
            setIsSubmitting(false);
        }
    };

    if (authError) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#211f1d]">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight text-red-500">Authentication Failed</h1>
                    <p className="text-[#9e9e9e]">Unable to establish a secure session.</p>
                </div>
            </div>
        );
    }

    if (authLoading || (exchanged && agentsLoading)) {
        return <LoadingScreen message="Loading workspace..." />;
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-[#211f1d] text-[#ececec] font-sans relative selection:bg-[#d09a74] selection:text-[#211f1d]">

            {/* Centered Content - Positioned significantly higher to end before midpoint */}
            <div className="w-full max-w-[640px] flex flex-col items-center gap-6 -translate-y-[28%]">

                {/* Greeting Section - Tighter spacing */}
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-[36px] font-serif font-normal tracking-tight text-[#f4f3f1] opacity-95 antialiased leading-none">What's on your mind?</h1>
                </div>

                {/* Main Input Box - Compact 'Blended' Container */}
                <div className="w-full bg-[#302e2b] rounded-[20px] border border-[#3e3c39]/40 shadow-xl overflow-hidden transition-all duration-300 focus-within:ring-1 focus-within:ring-[#3e3c39]/60">
                    <div className="p-3.5 pb-1">
                        <textarea
                            className="w-full bg-transparent text-[#ececec] placeholder-[#8e8d8c] border-none outline-none text-[17px] leading-relaxed p-1 resize-none h-[48px] scrollbar-hide font-normal"
                            placeholder={`Message ${activeAgent?.name || 'Agent'}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>

                    <div className="px-3 pb-2.5 flex items-center justify-between">
                        {/* Left Actions (Attachments/History) */}
                        <div className="flex items-center gap-1">
                            <button className="p-1.5 text-[#9e9e9e] hover:text-[#ececec] hover:bg-[#3e3c39] rounded-lg transition-colors group">
                                <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            </button>
                        </div>

                        {/* Right Actions (Model Selector & Submit) */}
                        <div className="flex items-center gap-2">
                            {/* Agent Selector (Synced) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#9e9e9e] hover:text-[#ececec] hover:bg-[#3e3c39] transition-all text-[12px] font-medium tracking-wide">
                                        <span>{activeAgent?.name || "Select Agent"}</span>
                                        <ChevronDown className="w-3 h-3 opacity-60" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={8} className="w-[260px] bg-[#2a2826] border-[#3e3c39] p-1.5 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-100 dark">
                                    <div className="px-2 py-2 text-xs font-medium text-[#7e7c7a] tracking-wide mb-1 select-none">
                                        Model
                                    </div>
                                    {agents.map((agent: AgentWithIntegrations) => (
                                        <DropdownMenuItem
                                            key={agent.id}
                                            onClick={() => setActiveAgent(agent)}
                                            className="group flex items-center justify-between p-2 cursor-pointer focus:bg-[#3e3c39] data-[state=checked]:bg-[#3e3c39] rounded-lg outline-none transition-colors"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-[13px] text-[#ececec] group-focus:text-white">{agent.name}</span>
                                                {agent.description && (
                                                    <span className="text-[11px] text-[#8e8d8c] line-clamp-1 group-focus:text-[#9e9e9e]">{agent.description}</span>
                                                )}
                                            </div>
                                            {activeAgent?.id === agent.id && (
                                                <div className="text-[#d96c46]">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Submit Button */}
                            <button
                                onClick={() => handleSubmit()}
                                disabled={!input.trim() || isSubmitting}
                                className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                                    input.trim()
                                        ? "bg-[#d96c46] text-white hover:bg-[#c45a35] shadow-sm transform hover:scale-105"
                                        : "bg-[#3e3c39] text-[#5e5c5a] cursor-not-allowed"
                                )}
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom help text - Fixed at bottom */}
            <div className="absolute bottom-6 text-[11px] text-[#3e3c39] hover:text-[#5e5c5a] transition-colors cursor-default select-none">
                AI can make mistakes. Please verify important information.
            </div>
        </div>
    )
}
