"use client";

import * as React from "react";
import { useAgentContext } from "@wacht/nextjs";
import { useActiveAgent } from "@/components/agent-provider";
import { ChatInput } from "@/components/chat/chat-input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
    ConversationContent,
    UserMessageContent,
    AgentResponseContent,
    AssistantAcknowledgmentContent,
} from "@wacht/types";

// Helper to extract display text from strongly typed content
function getDisplayContent(content: ConversationContent): string {
    switch (content.type) {
        case "user_message":
            return (content as UserMessageContent).message;
        case "agent_response":
            return (content as AgentResponseContent).response;
        case "assistant_acknowledgment":
            return (content as AssistantAcknowledgmentContent)
                .acknowledgment_message;
        case "user_input_request":
            return content.question;
        case "system_decision":
            return content.reasoning;
        case "action_execution_result":
            return content.task_execution?.approach || "Executing...";
        case "context_results":
            return `Found ${content.result_count} results`;
        default:
            return "";
    }
}

// Format timestamp for display
function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return (
            date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            }) +
            " at " +
            date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            })
        );
    }
    return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Group consecutive system_decision messages
type GroupedMessage =
    | {
          type: "single";
          message: any;
      }
    | {
          type: "system_decisions";
          messages: any[];
      };

function groupMessages(messages: any[]): GroupedMessage[] {
    const grouped: GroupedMessage[] = [];
    let i = 0;

    const displayableMessages = messages.filter((msg) => {
        const displayContent = getDisplayContent(msg.content);
        return displayContent && displayContent.trim().length > 0;
    });

    while (i < displayableMessages.length) {
        const msg = displayableMessages[i];

        if (msg.content?.type === "system_decision") {
            // Collect consecutive system_decisions
            const decisions = [msg];
            while (
                i + 1 < displayableMessages.length &&
                displayableMessages[i + 1].content?.type === "system_decision"
            ) {
                i++;
                decisions.push(displayableMessages[i]);
            }
            grouped.push({ type: "system_decisions", messages: decisions });
        } else {
            grouped.push({ type: "single", message: msg });
        }
        i++;
    }

    return grouped;
}

// System Decision Card Component - Claude style
function SystemDecisionPills({ decisions }: { decisions: any[] }) {
    const [expanded, setExpanded] = useState(false);
    const count = decisions.length;
    const firstDecision = decisions[0];

    return (
        <div className="my-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between gap-3 border rounded-lg px-3 py-2 hover:bg-accent/5 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-muted-foreground truncate">
                        {getDisplayContent(firstDecision.content)}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {count > 1 && (
                        <span className="text-xs text-muted-foreground/70">
                            {count} decisions
                        </span>
                    )}
                    <svg
                        className={cn(
                            "w-4 h-4 text-muted-foreground/70 transition-transform",
                            expanded && "rotate-180",
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="mt-2 border-l pl-4 space-y-0.5 pb-2">
                    {decisions.map((msg, idx) => (
                        <div
                            key={msg.id}
                            className="flex items-start gap-2 text-sm text-muted-foreground/80"
                        >
                            <span className="text-muted-foreground/40 shrink-0 w-4 text-[11px] pt-0.5">
                                {idx + 1}.
                            </span>
                            <span className="leading-relaxed">
                                {getDisplayContent(msg.content)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SingleChatPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const chatId = params?.chatId as string;
    const initialMessage = searchParams?.get("message");
    const sentInitialRef = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isLoadingHistoryRef = useRef(false);

    const { activeAgent } = useActiveAgent();
    const agentName = activeAgent?.name || "default";

    const {
        messages,
        sendMessage,
        isExecuting,
        loadMoreMessages,
        hasMoreMessages,
        isLoadingMore,
        pendingMessage,
    } = useAgentContext({
        agentName,
        contextId: chatId,
    });

    useEffect(() => {
        if (initialMessage && !sentInitialRef.current) {
            sentInitialRef.current = true;
            sendMessage(initialMessage);
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [initialMessage, sendMessage]);

    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        if (
            messages.length > prevMessageCount.current &&
            !isLoadingHistoryRef.current &&
            scrollContainerRef.current
        ) {
            scrollContainerRef.current.scrollTop =
                scrollContainerRef.current.scrollHeight;
        }
        prevMessageCount.current = messages.length;
        isLoadingHistoryRef.current = false;
    }, [messages.length]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || isLoadingMore || !hasMoreMessages) return;

        if (container.scrollTop < 100) {
            isLoadingHistoryRef.current = true;
            const prevScrollHeight = container.scrollHeight;

            loadMoreMessages().then(() => {
                requestAnimationFrame(() => {
                    if (scrollContainerRef.current) {
                        const newScrollHeight =
                            scrollContainerRef.current.scrollHeight;
                        scrollContainerRef.current.scrollTop =
                            newScrollHeight - prevScrollHeight;
                    }
                });
            });
        }
    }, [isLoadingMore, hasMoreMessages, loadMoreMessages]);

    const handleSend = (text: string, files?: any[]) => {
        sendMessage(text, undefined, files);
    };

    // Group consecutive system_decisions
    const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

    return (
        <div className="flex flex-col h-full relative bg-background">
            <div className="shrink-0 h-10 flex items-center px-4" />

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 pb-64"
                onScroll={handleScroll}
            >
                {isLoadingMore && (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                    </div>
                )}

                <div className="max-w-3xl mx-auto pt-8 space-y-4">
                    {groupedMessages.map((group, idx) => {
                        if (group.type === "system_decisions") {
                            return (
                                <SystemDecisionPills
                                    key={`group-${idx}`}
                                    decisions={group.messages}
                                />
                            );
                        }

                        const msg = group.message;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-4",
                                    msg.role === "user"
                                        ? "justify-end"
                                        : "justify-start items-start",
                                )}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center text-xs font-normal shrink-0">
                                        A
                                    </div>
                                )}

                                <div
                                    className={cn(
                                        "max-w-[85%]",
                                        msg.role === "user"
                                            ? "flex-1 flex flex-col items-end"
                                            : "",
                                    )}
                                >
                                    {msg.role === "user" ? (
                                        <>
                                            <div className="bg-sidebar-accent text-foreground px-4 py-2.5 rounded-[12px] text-[15px] leading-relaxed">
                                                {getDisplayContent(msg.content)}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground mt-1">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </>
                                    ) : msg.content?.type ===
                                      "user_input_request" ? (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                            <span className="text-xs font-normal text-amber-500 block mb-1">
                                                Input Required
                                            </span>
                                            <span className="text-foreground">
                                                {getDisplayContent(msg.content)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                            <ReactMarkdown>
                                                {getDisplayContent(msg.content)}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-xs font-normal shrink-0 mt-1">
                                        U
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {pendingMessage && (
                        <div className="flex gap-4 justify-end">
                            <div className="flex flex-col items-end max-w-[85%]">
                                <div className="bg-sidebar-accent text-foreground px-4 py-2.5 rounded-[12px] text-[15px] leading-relaxed opacity-70">
                                    {pendingMessage}
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-xs font-normal shrink-0 mt-1 opacity-70">
                                U
                            </div>
                        </div>
                    )}
                    {isExecuting && !pendingMessage && (
                        <div className="flex gap-4 justify-start items-center">
                            <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center text-xs font-normal shrink-0">
                                A
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-2">
                                <span
                                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                                    style={{
                                        animationDelay: "0ms",
                                        animationDuration: "1s",
                                    }}
                                />
                                <span
                                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                                    style={{
                                        animationDelay: "150ms",
                                        animationDuration: "1s",
                                    }}
                                />
                                <span
                                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                                    style={{
                                        animationDelay: "300ms",
                                        animationDuration: "1s",
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto">
                    <ChatInput
                        placeholder="Reply..."
                        className="min-h-[52px]"
                        agentName={activeAgent?.name}
                        onSend={handleSend}
                    />
                    <div className="text-center mt-2">
                        <span className="text-[11px] text-muted-foreground">
                            AI can make mistakes. Please use with discretion.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
