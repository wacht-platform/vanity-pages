"use client"

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
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ChatsPage() {
    const [search, setSearch] = useState("");
    const router = useRouter();

    const { contexts, loading, error, hasMore, deleteContext, updateContext } = useAgentContexts({
        limit: 50,
        search: search || undefined,
    });

    console.log(error);

    return (
        <div className="flex flex-col h-full bg-[#211f1d] text-[#ececec] relative overflow-hidden font-sans selection:bg-[#d09a74] selection:text-[#211f1d]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 max-w-4xl mx-auto w-full">
                <h1 className="text-3xl font-serif text-[#f4f3f1] opacity-95">Chats</h1>
                <Link href="/agents" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ececec] text-[#211f1d] rounded-lg text-[13px] font-medium hover:bg-white transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    New chat
                </Link>
            </div>

            {/* Search & Content */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 pb-10 scrollbar-hide">

                {/* Search Bar */}
                <div className="relative mb-8">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9e9e]">
                        <Search className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search your chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#302e2b] border border-[#3e3c39] rounded-xl py-3 pl-10 pr-4 text-[15px] text-[#ececec] placeholder-[#8e8d8c] focus:outline-none focus:ring-1 focus:ring-[#d96c46]/50 focus:border-[#d96c46]/50 transition-all font-normal"
                    />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-4 py-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-[#3e3c39]/30">
                                <div className="space-y-2 w-full">
                                    <Skeleton className="h-4 w-[250px] bg-[#3e3c39]/50" />
                                    <Skeleton className="h-3 w-[150px] bg-[#3e3c39]/50" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="flex items-center justify-center py-20 text-red-400">
                        Failed to load chats
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && contexts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9e9e9e]">
                        <p>No chats yet</p>
                        <Link href="/agents" className="text-[#d96c46] mt-2 hover:underline">
                            Start a new conversation
                        </Link>
                    </div>
                )}

                {/* Subheader */}
                {!loading && contexts.length > 0 && (
                    <div className="flex items-center justify-between text-[13px] text-[#9e9e9e] mb-2 px-2">
                        <span>{contexts.length} chat{contexts.length !== 1 ? 's' : ''}</span>
                        {/* <button className="hover:text-[#ececec] transition-colors">Select</button> */}
                    </div>
                )}

                {/* Chat List with Dividers */}
                {!loading && (
                    <div className="flex flex-col">
                        {contexts.map((context) => (
                            <ChatRow
                                key={context.id}
                                chat={context}
                                time={formatRelativeTime(context.last_activity_at)}
                                onDelete={deleteContext}
                                onRename={(id, title) => updateContext(id, { title })}
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
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

function ChatRow({
    chat,
    time,
    onDelete,
    onRename
}: {
    chat: any,
    time: string,
    onDelete: (id: string) => Promise<void>,
    onRename: (id: string, newTitle: string) => Promise<void>
}) {
    const [isRenaming, setIsRenaming] = useState(false)
    const [title, setTitle] = useState(chat.title || "Untitled")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isRenaming])

    const handleRename = async () => {
        if (!title.trim() || title === chat.title) {
            setIsRenaming(false)
            setTitle(chat.title || "Untitled")
            return
        }
        try {
            await onRename(chat.id, title)
            setIsRenaming(false)
        } catch (e) {
            // Revert on error
            setTitle(chat.title || "Untitled")
            setIsRenaming(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this chat?")) return
        try {
            await onDelete(chat.id)
        } catch (error) {
            console.error("Failed to delete chat", error)
        }
    }

    if (isRenaming) {
        return (
            <div className="py-4 px-2 border-b border-[#3e3c39]/30">
                <Input
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename()
                        if (e.key === 'Escape') {
                            setIsRenaming(false)
                            setTitle(chat.title || "Untitled")
                        }
                    }}
                    onBlur={handleRename}
                    className="h-9 text-[15px] bg-[#302e2b] border-[#3e3c39] text-[#ececec]"
                />
            </div>
        )
    }

    return (
        <Link
            href={`/agents/c/${chat.id}`}
            className="group flex items-start justify-between py-4 px-3 border-b border-[#3e3c39]/30 hover:bg-[#302e2b]/50 transition-colors -mx-2"
        >
            <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                <span className="text-[15px] font-medium text-[#ececec] truncate">{chat.title || "Untitled"}</span>
                <span className="text-[12px] text-[#9e9e9e] font-normal">{time}</span>
            </div>

            {/* Action Menu (Visible on Hover) */}
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-[#9e9e9e] hover:text-[#ececec] hover:bg-[#3e3c39] rounded-md transition-colors focus:outline-none">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={0}
                        className="w-32 bg-[#2a2826] border-[#3e3c39] p-1 shadow-xl text-xs rounded-lg"
                    >
                        <DropdownMenuItem
                            onClick={() => setIsRenaming(true)}
                            className="text-[#9e9e9e] focus:text-[#ececec] focus:bg-[#3e3c39] cursor-pointer rounded"
                        >
                            <Pencil className="mr-2 w-3 h-3" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="text-red-400 focus:text-red-300 focus:bg-red-400/10 cursor-pointer rounded"
                        >
                            <Trash className="mr-2 w-3 h-3" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Link>
    )
}
