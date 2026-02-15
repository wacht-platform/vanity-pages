"use client"

import { useClient, useAgentContexts } from "@wacht/nextjs";
import { useRouter } from "next/navigation";
import { useActiveAgent } from "@/components/agent-provider";
import { useState } from "react";
import { ChevronDown, ArrowUp, Plus, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AgentWithIntegrations } from "@wacht/types";

export default function AgentsLandingPage() {
    const router = useRouter();
    const { client } = useClient();

    const { activeAgent, setActiveAgent, agents, loading, hasSession, sessionError } = useActiveAgent();
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

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-background text-foreground font-sans relative selection:bg-primary/20 selection:text-background">

            <div className="w-full max-w-[640px] flex flex-col items-center gap-6 -translate-y-[28%]">

                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-[36px] font-serif font-normal tracking-tight text-foreground opacity-95 antialiased leading-none">What's on your mind?</h1>
                </div>

                <div className="w-full bg-card rounded-[20px] border border-border shadow-xl overflow-hidden transition-all duration-300 focus-within:ring-1 focus-within:ring-border/60">
                    <div className="p-3.5 pb-1">
                        <textarea
                            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none text-[17px] leading-relaxed p-1 resize-none h-[48px] scrollbar-hide font-normal"
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
                            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors group">
                                <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            </button>
                        </div>

                        {/* Right Actions (Model Selector & Submit) */}
                        <div className="flex items-center gap-2">
                            {/* Agent Selector (Synced) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[12px] font-medium tracking-wide">
                                        <span>{activeAgent?.name || "Select Agent"}</span>
                                        <ChevronDown className="w-3 h-3 opacity-60" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={8} className="w-[260px] bg-popover border-border p-1.5 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2 py-2 text-xs font-medium text-muted-foreground tracking-wide mb-1 select-none">
                                        Model
                                    </div>
                                    {agents.map((agent: AgentWithIntegrations) => (
                                        <DropdownMenuItem
                                            key={agent.id}
                                            onClick={() => setActiveAgent(agent)}
                                            className="group flex items-center justify-between p-2 cursor-pointer focus:bg-accent data-[state=checked]:bg-accent rounded-lg outline-none transition-colors"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-[13px] text-foreground group-focus:text-white">{agent.name}</span>
                                                {agent.description && (
                                                    <span className="text-[11px] text-muted-foreground line-clamp-1 group-focus:text-muted-foreground">{agent.description}</span>
                                                )}
                                            </div>
                                            {activeAgent?.id === agent.id && (
                                                <div className="text-primary">
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
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transform hover:scale-105"
                                        : "bg-border text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom help text - Fixed at bottom */}
            <div className="absolute bottom-6 text-[11px] text-border hover:text-muted-foreground transition-colors cursor-default select-none">
                AI can make mistakes. Please verify important information.
            </div>
        </div>
    )
}
