"use client";

import { Search, Plus, MoreHorizontal, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentContexts } from "@wacht/nextjs";
import type { AgentContext } from "@wacht/types";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useActiveAgent } from "@/components/agent-provider";

export default function ChatsPage() {
    const [search, setSearch] = useState("");
    const router = useRouter();
    const { hasSession, loading: sessionLoading } = useActiveAgent();

    const { contexts, loading, error, hasMore, deleteContext, updateContext } =
        useAgentContexts({
            limit: 50,
            search: search || undefined,
            enabled: hasSession,
        });

    return (
        <div className="flex flex-col h-full bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-background">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 max-w-4xl mx-auto w-full">
                <h1 className="text-3xl font-normal text-foreground opacity-95">
                    Chats
                </h1>
                <Link
                    href="/agents"
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-normal text-primary-foreground transition-colors shadow-sm hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    New chat
                </Link>
            </div>

            {/* Search & Content */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 pb-10 scrollbar-hide">
                {/* Search Bar */}
                <div className="relative mb-8">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Search className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search your chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-border/50 bg-card py-3 pl-10 pr-4 text-[15px] font-normal text-foreground placeholder:text-muted-foreground transition-all focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/40"
                    />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-4 py-4">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 border-b"
                            >
                                <div className="space-y-2 w-full">
                                    <Skeleton className="h-4 w-[250px] bg-muted" />
                                    <Skeleton className="h-3 w-[150px] bg-muted" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        Failed to load chats
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && contexts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <p>No chats yet</p>
                        <Link
                            href="/agents"
                            className="text-primary mt-2 hover:underline"
                        >
                            Start a new conversation
                        </Link>
                    </div>
                )}

                {/* Subheader */}
                {!loading && contexts.length > 0 && (
                    <div className="flex items-center justify-between text-[13px] text-muted-foreground mb-2 px-2">
                        <span>
                            {contexts.length} chat
                            {contexts.length !== 1 ? "s" : ""}
                        </span>
                        {/* <button className="hover:text-foreground transition-colors">Select</button> */}
                    </div>
                )}

                {/* Chat List with Dividers */}
                {!loading && (
                    <div className="flex flex-col">
                        {contexts.map((context: AgentContext) => (
                            <ChatRow
                                key={context.id}
                                chat={context}
                                time={formatRelativeTime(
                                    context.last_activity_at,
                                )}
                                onDelete={deleteContext}
                                onRename={(id, title) =>
                                    updateContext(id, { title })
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatRelativeTime(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
}

function ChatRow({
    chat,
    time,
    onDelete,
    onRename,
}: {
    chat: any;
    time: string;
    onDelete: (id: string) => Promise<void>;
    onRename: (id: string, newTitle: string) => Promise<void>;
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [title, setTitle] = useState(chat.title || "Untitled");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRename = async () => {
        if (!title.trim() || title === chat.title) {
            setIsRenaming(false);
            setTitle(chat.title || "Untitled");
            return;
        }
        try {
            await onRename(chat.id, title);
            setIsRenaming(false);
        } catch (e) {
            // Revert on error
            setTitle(chat.title || "Untitled");
            setIsRenaming(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this chat?")) return;
        try {
            await onDelete(chat.id);
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    if (isRenaming) {
        return (
            <div className="py-4 px-2 border-b">
                <Input
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") {
                            setIsRenaming(false);
                            setTitle(chat.title || "Untitled");
                        }
                    }}
                    onBlur={handleRename}
                    className="h-9 text-[15px] bg-card text-foreground"
                />
            </div>
        );
    }

    return (
        <Link
            href={`/agents/c/${chat.id}`}
            className="group -mx-2 flex items-start justify-between rounded-lg border-b border-border/30 px-3 py-4 transition-colors hover:bg-accent/50"
        >
            <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                <span className="text-[15px] font-normal text-foreground truncate">
                    {chat.title || "Untitled"}
                </span>
                <span className="text-[12px] text-muted-foreground font-normal">
                    {time}
                </span>
            </div>

            {/* Action Menu (Visible on Hover) */}
            <div
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors focus:outline-none">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={0}
                        className="w-32 bg-popover border-border p-1 shadow-xl text-xs rounded-lg"
                    >
                        <DropdownMenuItem
                            onClick={() => setIsRenaming(true)}
                            className="text-muted-foreground focus:text-foreground focus:bg-accent cursor-pointer rounded"
                        >
                            <Pencil className="mr-2 w-3 h-3" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded"
                        >
                            <Trash className="mr-2 w-3 h-3" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Link>
    );
}
