"use client";

import { useAgentContext, useAgentContexts } from "@wacht/nextjs";
import { useRouter } from "next/navigation";
import { useActiveAgent } from "@/components/agent-provider";
import { useEffect, useRef, useState } from "react";
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

    const {
        activeAgent,
        setActiveAgent,
        agents,
        loading,
        hasSession,
        sessionError,
    } = useActiveAgent();
    const { createContext } = useAgentContexts();
    const [queuedExecution, setQueuedExecution] = useState<{
        contextId: string;
        message: string;
        files: File[];
    } | null>(null);
    const isExecutingQueuedRef = useRef(false);
    const { sendMessage } = useAgentContext({
        agentName: activeAgent?.name || "default",
        contextId: queuedExecution?.contextId || "",
    });

    const [input, setInput] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles((prev) => [...prev, ...files]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const currentAgentId =
            activeAgent?.id || (agents.length > 0 ? agents[0].id : null);

        if (
            (!input.trim() && selectedFiles.length === 0) ||
            isSubmitting ||
            !currentAgentId
        ) {
            return;
        }

        setIsSubmitting(true);
        try {
            const context = await createContext({
                title: input.trim().slice(0, 50) || "New Chat",
            });

            if (context?.id) {
                setQueuedExecution({
                    contextId: context.id,
                    message: input.trim(),
                    files: [...selectedFiles],
                });
            }
        } catch (e) {
            console.error("Failed to create chat", e);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!queuedExecution || isExecutingQueuedRef.current) return;

        isExecutingQueuedRef.current = true;
        const run = async () => {
            try {
                await sendMessage(queuedExecution.message, queuedExecution.files);
                router.push(`/agents/c/${queuedExecution.contextId}`);
            } catch (err) {
                console.error("Failed to send initial message", err);
                setIsSubmitting(false);
            } finally {
                isExecutingQueuedRef.current = false;
                setQueuedExecution(null);
            }
        };

        void run();
    }, [queuedExecution, sendMessage, router]);

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-background text-foreground font-sans relative selection:bg-primary/20 selection:text-background">
            <div className="w-full max-w-[620px] flex flex-col items-center gap-5 -translate-y-[22%]">
                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-[32px] font-normal tracking-tight text-foreground opacity-95 antialiased leading-none">
                        What's on your mind?
                    </h1>
                </div>

                <div className="w-full bg-card rounded-2xl border border-border/70 shadow-lg overflow-hidden transition-all duration-200 focus-within:ring-1 focus-within:ring-border/60">
                    {selectedFiles.length > 0 && (
                        <div className="px-3.5 pt-3">
                            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/30 bg-secondary/30 p-2">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}-${index}`}
                                        className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-secondary/60 px-2 py-1 text-xs"
                                    >
                                        <span className="max-w-[180px] truncate">
                                            {file.name}
                                        </span>
                                        <button
                                            type="button"
                                            className="text-muted-foreground hover:text-foreground"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="px-3.5 pt-3 pb-1">
                        <textarea
                            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none text-[15px] leading-relaxed p-1 resize-none h-[42px] scrollbar-hide font-normal"
                            placeholder={`Message ${activeAgent?.name || "Agent"}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>

                    <div className="px-3 pb-3 flex items-center justify-between">
                        {/* Left Actions (Attachments/History) */}
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors group"
                            >
                                <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            </button>
                        </div>

                        {/* Right Actions (Model Selector & Submit) */}
                        <div className="flex items-center gap-2">
                            {/* Agent Selector (Synced) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-[12px] font-normal tracking-wide">
                                        <span>
                                            {activeAgent?.name ||
                                                "Select Agent"}
                                        </span>
                                        <ChevronDown className="w-3 h-3 opacity-60" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    sideOffset={8}
                                    className="w-[260px] bg-popover border-border p-1.5 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-100"
                                >
                                    <div className="px-2 py-2 text-xs font-normal text-muted-foreground tracking-wide mb-1 select-none">
                                        Model
                                    </div>
                                    {agents.map(
                                        (agent: AgentWithIntegrations) => (
                                            <DropdownMenuItem
                                                key={agent.id}
                                                onClick={() =>
                                                    setActiveAgent(agent)
                                                }
                                                className="group flex items-center justify-between p-2 cursor-pointer focus:bg-accent data-[state=checked]:bg-accent rounded-lg outline-none transition-colors"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-normal text-[13px] text-foreground group-focus:text-white">
                                                        {agent.name}
                                                    </span>
                                                    {agent.description && (
                                                        <span className="text-[11px] text-muted-foreground line-clamp-1 group-focus:text-muted-foreground">
                                                            {agent.description}
                                                        </span>
                                                    )}
                                                </div>
                                                {activeAgent?.id ===
                                                    agent.id && (
                                                    <div className="text-primary">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                            </DropdownMenuItem>
                                        ),
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Submit Button */}
                            <button
                                onClick={() => handleSubmit()}
                                disabled={
                                    (!input.trim() &&
                                        selectedFiles.length === 0) ||
                                    isSubmitting
                                }
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200",
                                    input.trim()
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                        : "bg-border text-muted-foreground cursor-not-allowed",
                                )}
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom help text - Fixed at bottom */}
            <div className="absolute bottom-6 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors cursor-default select-none">
                AI can make mistakes. Please verify important information.
            </div>
        </div>
    );
}
