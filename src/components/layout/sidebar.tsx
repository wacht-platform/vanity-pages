"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Plus,
    MessageSquare,
    Link2,
    PanelLeftClose,
    Menu,
    MoreHorizontal,
    Pencil,
    Trash,
    Check,
    ChevronDown,
} from "lucide-react";
import { useActiveAgent } from "../agent-provider";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentContexts } from "@wacht/nextjs";

const SIDEBAR_WIDTH = "260px";
const SIDEBAR_COLLAPSED = "52px";

export function AppSidebar({ className }: { className?: string }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const pathname = usePathname();
    const { hasSession } = useActiveAgent();
    const [limit, setLimit] = React.useState(20);

    const {
        contexts: chats,
        loading,
        hasMore,
        deleteContext,
        updateContext,
    } = useAgentContexts({
        limit: limit,
        enabled: hasSession,
    });

    const loadMore = () => {
        setLimit((prev) => prev + 20);
    };

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="md:hidden fixed top-3 left-3 z-50 p-2 bg-sidebar text-sidebar-foreground rounded-md"
            >
                <Menu className="w-4 h-4" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={cn(
                    "flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-200 z-50",
                    isCollapsed ? "w-[52px]" : "w-[260px]",
                    "fixed md:relative inset-y-0 left-0",
                    isMobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0",
                    className,
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-11 px-3 border-b border-sidebar-border/40">
                    {!isCollapsed && <AgentSelector />}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "p-1.5 hover:bg-sidebar-accent rounded-md transition-colors text-muted-foreground hover:text-sidebar-foreground",
                            isCollapsed && "mx-auto",
                        )}
                    >
                        <PanelLeftClose
                            className={cn(
                                "w-4 h-4",
                                isCollapsed && "rotate-180",
                            )}
                        />
                    </button>
                </div>

                {/* New Chat */}
                <div className="px-2 py-2">
                    <Link
                        href="/agents"
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors",
                            isCollapsed && "justify-center",
                        )}
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span>New</span>}
                    </Link>
                </div>

                {/* Nav */}
                <nav className="px-2 space-y-0.5">
                    <NavItem
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Chats"
                        isCollapsed={isCollapsed}
                        href="/agents/chats"
                    />
                    <NavItem
                        icon={<Link2 className="w-4 h-4" />}
                        label="Integrations"
                        isCollapsed={isCollapsed}
                        href="/agents/integrations"
                    />
                </nav>

                {/* Recents */}
                <div className="flex-1 overflow-y-auto mt-2 min-h-0">
                    {!isCollapsed && (
                        <div className="px-2">
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                Recents
                            </p>
                            <div className="space-y-0.5">
                                {loading ? (
                                    <div className="space-y-1 px-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton
                                                key={i}
                                                className="h-6 w-full bg-sidebar-accent/50 rounded"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    chats.slice(0, 15).map((chat: any) => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={
                                                pathname ===
                                                `/agents/c/${chat.id}`
                                            }
                                            onDelete={async (id) => {
                                                try {
                                                    await deleteContext(id);
                                                } catch (e) {}
                                            }}
                                            onRename={async (id, title) => {
                                                try {
                                                    await updateContext(id, {
                                                        title,
                                                    });
                                                } catch (e) {}
                                            }}
                                        />
                                    ))
                                )}
                                {!loading && hasMore && chats.length > 15 && (
                                    <button
                                        onClick={loadMore}
                                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1.5"
                                    >
                                        More
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </aside>
        </>
    );
}

function NavItem({
    icon,
    label,
    isCollapsed,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    isCollapsed: boolean;
    href: string;
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                isCollapsed && "justify-center",
                isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
            )}
            title={isCollapsed ? label : undefined}
        >
            {icon}
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );
}

function ChatItem({
    chat,
    isActive,
    onDelete,
    onRename,
}: {
    chat: any;
    isActive: boolean;
    onDelete: (id: string) => Promise<void>;
    onRename: (id: string, newTitle: string) => Promise<void>;
}) {
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [title, setTitle] = React.useState(chat.title || "Untitled");
    const router = useRouter();
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
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
        } catch (e) {
            setTitle(chat.title || "Untitled");
        }
        setIsRenaming(false);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;
        try {
            await onDelete(chat.id);
            if (isActive) router.push("/agents");
        } catch (e) {}
    };

    if (isRenaming) {
        return (
            <div className="px-1 py-0.5">
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
                    className="h-6 border-0 bg-sidebar-accent text-xs"
                />
            </div>
        );
    }

    return (
        <div className="group relative">
            <Link
                href={`/agents/c/${chat.id}`}
                className={cn(
                    "block w-full text-left px-2 py-1.5 text-sm rounded-md truncate transition-colors",
                    isActive
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
            >
                {chat.title || "Untitled"}
            </Link>

            <div
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-0.5 hover:bg-sidebar-accent rounded text-muted-foreground hover:text-sidebar-foreground">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={4}
                        className="w-28 p-1"
                    >
                        <DropdownMenuItem
                            onClick={() => setIsRenaming(true)}
                            className="text-xs py-1.5 cursor-pointer"
                        >
                            <Pencil className="mr-1.5 w-3 h-3" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="text-xs py-1.5 cursor-pointer text-destructive focus:text-destructive"
                        >
                            <Trash className="mr-1.5 w-3 h-3" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function AgentSelector() {
    const { activeAgent, setActiveAgent, agents } = useActiveAgent();
    const [open, setOpen] = React.useState(false);

    if (!activeAgent && agents.length === 0) {
        return (
            <div className="h-5 w-20 rounded bg-sidebar-accent/50 animate-pulse" />
        );
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className="outline-none">
                <div className="flex items-center gap-1 hover:bg-sidebar-accent rounded-md px-1.5 py-1 -ml-1.5 transition-colors">
                    <span className="text-sm font-normal">
                        {activeAgent?.name || "Agent"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="w-52 p-1"
            >
                {agents.map((agent) => (
                    <DropdownMenuItem
                        key={agent.id}
                        onClick={() => setActiveAgent(agent)}
                        className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-sm"
                    >
                        <span className="truncate">{agent.name}</span>
                        {activeAgent?.id === agent.id && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
