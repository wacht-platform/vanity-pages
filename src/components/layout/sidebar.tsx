"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Plus, PanelsTopLeft, Search, Code, PanelLeftClose, PanelLeftOpen, Menu, MoreHorizontal, Pencil, Trash, Star, Check, X, ChevronDown } from "lucide-react"
import { useActiveAgent } from "../agent-provider"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentContexts } from "@wacht/nextjs"

export function AppSidebar({ className }: { className?: string }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const [isMobileOpen, setIsMobileOpen] = React.useState(false)
    const pathname = usePathname()
    const { hasSession } = useActiveAgent()
    const [limit, setLimit] = React.useState(20)

    const { contexts: chats, loading, hasMore, deleteContext, updateContext } = useAgentContexts({
        limit: limit,
        enabled: hasSession
    })

    const loadMore = () => {
        setLimit(prev => prev + 20)
    }

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <>
            {/* Mobile Trigger (Fixed top left) */}
            <div className="md:hidden fixed top-3 left-3 z-50">
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 bg-sidebar text-sidebar-foreground rounded-md shadow-sm border border-transparent hover:text-sidebar-foreground/80 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={cn(
                "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-50 group/sidebar",
                // Desktop Widths
                isCollapsed ? "w-[60px]" : "w-[260px]",
                // Mobile Positioning
                "fixed md:relative inset-y-0 left-0",
                // Mobile visibility toggle
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                className
            )}>

                {/* Header / Org */}
                <div className={cn("flex items-center p-3 pb-2 relative min-h-[52px]", isCollapsed ? "justify-center px-0" : "")}>
                    {!isCollapsed ? (
                        <div className="flex-1 min-w-0">
                            <AgentSelector />
                        </div>
                    ) : (
                        null
                    )}

                    {/* Toggle Button */}
                    {!isMobileOpen && (
                        <div className="flex items-center gap-1">
                            <ModeToggle />
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className={cn(
                                    "flex text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 focus:outline-none",
                                    isCollapsed
                                        ? "static mx-auto mt-2"
                                        : "absolute right-3 top-[30px] -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 z-20"
                                )}
                                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            >
                                {isCollapsed ? (
                                    <PanelLeftOpen className="w-5 h-5 opacity-70" />
                                ) : (
                                    <PanelLeftClose className="w-5 h-5 opacity-70" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* New Chat Action */}
                <div className={cn("px-3 pb-4", isCollapsed && "px-2 pb-2 mt-2")}>
                    <Link
                        href="/agents"
                        className={cn(
                            "w-full flex items-center bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground rounded-[6px] border border-sidebar-border hover:border-border transition-all group shadow-sm",
                            isCollapsed ? "h-10 justify-center px-0" : "h-8 justify-between px-2"
                        )}
                        title="New Chat"
                    >
                        {isCollapsed ? (
                            <Plus className="w-5 h-5 text-sidebar-primary" />
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[14px] font-medium whitespace-nowrap">New chat</span>
                                </div>
                            </>
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <div className={cn("flex-1 overflow-y-auto px-3 space-y-4 min-h-0 scrollbar-hide", isCollapsed && "px-2")}>

                    <div className="space-y-0.5">
                        <NavItem icon={<Search className="w-4 h-4" />} label="Chats" isCollapsed={isCollapsed} href="/agents/chats" />
                        <NavItem icon={<PanelsTopLeft className="w-4 h-4" />} label="Integrations" isCollapsed={isCollapsed} href="/agents/integrations" />
                    </div>

                    {!isCollapsed && (
                        <div className="space-y-4 animate-in fade-in duration-300 delay-100">
                            {/* Grouped Chats */}
                            {Object.entries(groupChatsByDate(chats)).map(([group, groupChats]) => (
                                groupChats.length > 0 && (
                                    <div key={group} className="space-y-0.5">
                                        <h3 className="px-2 mb-1 text-xs font-normal text-muted-foreground uppercase tracking-wide whitespace-nowrap">{group}</h3>
                                        {groupChats.map(chat => (
                                            <ChatItem
                                                key={chat.id}
                                                chat={chat}
                                                isActive={pathname === `/agents/c/${chat.id}`}
                                                onDelete={async (id) => {
                                                    try {
                                                        await deleteContext(id)
                                                    } catch (e) {
                                                        console.error("Failed to delete", e)
                                                    }
                                                }}
                                                onRename={async (id, title) => {
                                                    try {
                                                        await updateContext(id, { title })
                                                    } catch (e) {
                                                        console.error("Failed to rename", e)
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )
                            ))}

                            {loading && (
                                <div className="space-y-4 px-2 mt-1">
                                    {/* Loading Skeletons with headers */}
                                    <div className="space-y-1">
                                        <Skeleton className="h-3 w-12 bg-sidebar-accent/50 mb-2" />
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-6 w-full bg-sidebar-accent/50 rounded-md" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!loading && hasMore && (
                                <button
                                    onClick={loadMore}
                                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
                                >
                                    Show more
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// Helper to group chats by date
function groupChatsByDate(chats: any[]) {
    const groups: Record<string, any[]> = {
        "Today": [],
        "Yesterday": [],
        "Recent": [] // Everything else goes here
    }

    if (!Array.isArray(chats)) {
        return groups
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    chats.forEach(chat => {
        const dateStr = chat.last_activity_at || chat.created_at || new Date().toISOString()
        const date = new Date(dateStr)
        // Normalize comparison date to midnight for day comparison
        const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (compareDate.getTime() === today.getTime()) {
            groups["Today"].push(chat)
        } else if (compareDate.getTime() === yesterday.getTime()) {
            groups["Yesterday"].push(chat)
        } else {
            groups["Recent"].push(chat)
        }
    })

    return groups
}

function NavItem({ icon, label, isCollapsed, href }: { icon: React.ReactNode, label: string, isCollapsed: boolean, href?: string }) {
    const content = (
        <>
            {icon}
            {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}

            {/* Tooltip for Collapsed State */}
            {isCollapsed && (
                <div className="absolute left-[calc(100%+8px)] bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {label}
                </div>
            )}
        </>
    )

    const classes = cn(
        "w-full flex items-center px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-[6px] transition-colors relative group",
        isCollapsed ? "justify-center h-9" : "gap-2.5"
    )

    if (href) {
        return <Link href={href} className={classes}>{content}</Link>
    }

    return (
        <button className={classes}>
            {content}
        </button>
    )
}

function ChatItem({
    chat,
    isActive,
    onDelete,
    onRename
}: {
    chat: any,
    isActive: boolean,
    onDelete: (id: string) => Promise<void>,
    onRename: (id: string, newTitle: string) => Promise<void>
}) {
    const [isRenaming, setIsRenaming] = React.useState(false)
    const [title, setTitle] = React.useState(chat.title || "Untitled Chat")
    const router = useRouter()
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isRenaming])

    const handleRename = async () => {
        if (!title.trim() || title === chat.title) {
            setIsRenaming(false)
            setTitle(chat.title || "Untitled Chat")
            return
        }

        try {
            await onRename(chat.id, title)
            setIsRenaming(false)
        } catch (e) {
            setTitle(chat.title || "Untitled Chat")
            setIsRenaming(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this chat?")) return

        try {
            await onDelete(chat.id)
            if (isActive) {
                router.push('/agents')
            }
        } catch (error) {
            console.error("Failed to delete chat", error)
        }
    }

    if (isRenaming) {
        return (
            <div className="flex items-center px-2 py-1 gap-1">
                <Input
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename()
                        if (e.key === 'Escape') {
                            setIsRenaming(false)
                            setTitle(chat.title || "Untitled Chat")
                        }
                    }}
                    onBlur={handleRename}
                    className="h-7 text-xs px-2"
                />
            </div>
        )
    }

    return (
        <div className="group relative">
            <Link
                href={`/agents/c/${chat.id}`}
                className={cn(
                    "block w-full text-left px-2 py-1.5 text-[13px] rounded-[6px] truncate transition-colors pr-8",
                    isActive
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
            >
                {chat.title || "Untitled Chat"}
            </Link>

            <div
                className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive && "opacity-100"
                )}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-32 bg-popover border-border p-1 shadow-xl text-xs"
                    >
                        <DropdownMenuItem
                            onClick={() => setIsRenaming(true)}
                            className="text-muted-foreground focus:text-foreground focus:bg-accent cursor-pointer"
                        >
                            <Pencil className="mr-2 w-3 h-3" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                            <Trash className="mr-2 w-3 h-3" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

function AgentSelector() {
    const { activeAgent, setActiveAgent, agents } = useActiveAgent();
    // Start with closed state
    const [open, setOpen] = React.useState(false);

    // Fallback if no agents loaded yet
    if (!activeAgent && agents.length === 0) {
        return <div className="h-9 w-full rounded-md bg-sidebar-accent/50 animate-pulse" />
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className="w-fit max-w-[200px]">
                <section className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-sidebar-accent rounded-lg transition-colors group/selector outline-none">
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 w-full">
                            <span className="text-[14px] font-medium text-foreground truncate block max-w-[160px]">
                                {activeAgent?.name || "Select Agent"}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70 group-hover/selector:opacity-100" />
                        </div>
                    </div>
                </section>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="w-[320px] bg-popover border-border p-1.5 shadow-xl rounded-xl"
            >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mb-1">
                    Your Agents
                </div>
                {agents.map(agent => (
                    <DropdownMenuItem
                        key={agent.id}
                        onClick={() => setActiveAgent(agent)}
                        className="flex items-center justify-between p-2.5 cursor-pointer focus:bg-accent data-[state=checked]:bg-accent rounded-lg text-sm"
                    >
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium text-foreground truncate">{agent.name}</span>
                            {agent.description && <span className="text-xs text-muted-foreground truncate opacity-70">{agent.description}</span>}
                        </div>
                        {activeAgent?.id === agent.id && <Check className="w-4 h-4 text-foreground" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
