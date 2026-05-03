"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProjectThreadFeed, useProjectThreads } from "@wacht/nextjs";
import {
    Archive,
    ArchiveRestore,
    ClipboardCheck,
    GitBranch,
    MessageSquare,
    Zap,
} from "lucide-react";
import {
    IconChecklist,
    IconCompass,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
    IconMenu2,
    IconPlus,
    IconSearch,
    IconConnection,
} from "@tabler/icons-react";

import type { ActorProject, Agent, AgentThread } from "@wacht/types";
import { useActiveAgent } from "../agent-provider";
import { CreateProjectDialog } from "@/components/agent/project-dialogs";
import { SidebarCommand } from "@/components/layout/sidebar-command";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarProjectGroups } from "@/hooks/use-sidebar-project-groups";
import { cn } from "@/lib/utils";

function initials(name: string) {
    return name
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");
}

function StatusDot({ status }: { status?: string }) {
    if (status === "running" || status === "in_progress") {
        return (
            <span className="size-1.5 shrink-0 rounded-full bg-blue-500 animate-pulse" />
        );
    }
    if (status === "completed") {
        return (
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500/80" />
        );
    }
    if (status === "failed" || status === "blocked") {
        return (
            <span className="size-1.5 shrink-0 rounded-full bg-rose-500/80" />
        );
    }
    return <span className="size-1.5 shrink-0 rounded-full bg-border" />;
}

const shellButtonClass =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const primaryNavItemClass =
    "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const primaryNavItemActiveClass = "bg-accent text-foreground";
const nestedNavItemClass =
    "flex h-8 items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const nestedNavItemActiveClass = "bg-accent text-foreground";

export function AppSidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [isCommandOpen, setIsCommandOpen] = React.useState(false);
    const { agents, isSidebarCollapsed, setIsSidebarCollapsed } =
        useActiveAgent();
    const {
        projects,
        loading: workspaceLoading,
        currentProjectId,
        createProject,
    } = useSidebarProjectGroups(true);
    const [openProjectId, setOpenProjectId] = React.useState<string | null>(
        null,
    );
    const hasInitializedOpenProject = React.useRef(false);
    const previousCurrentProjectId = React.useRef<string | null>(null);

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    React.useEffect(() => {
        if (
            currentProjectId &&
            currentProjectId !== previousCurrentProjectId.current
        ) {
            setOpenProjectId(currentProjectId);
            previousCurrentProjectId.current = currentProjectId;
            hasInitializedOpenProject.current = true;
            return;
        }

        if (!hasInitializedOpenProject.current && projects.length > 0) {
            setOpenProjectId(projects[0].id);
            hasInitializedOpenProject.current = true;
        }
    }, [currentProjectId, projects]);

    return (
        <>
                <SidebarCommand
                    currentProjectId={currentProjectId}
                    open={isCommandOpen}
                    onOpenChange={setIsCommandOpen}
                    agents={agents}
                    onCreateProject={async (request) => (await createProject(request)).data}
                    projects={projects}
                />

            <button
                type="button"
                onClick={() => setIsMobileOpen((current) => !current)}
                className="fixed left-3 top-3 z-50 flex size-9 items-center justify-center rounded-md border border-border/60 bg-background text-foreground shadow-sm md:hidden"
                aria-label="Toggle sidebar"
            >
                <IconMenu2 size={16} stroke={1.8} />
            </button>

            {isMobileOpen ? (
                <div
                    className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            ) : null}

            <aside
                className={cn(
                    "fixed z-50 flex h-full shrink-0 flex-col border-r border-sidebar-border/70 bg-sidebar text-sidebar-foreground transition-all duration-200 ease-out md:relative",
                    isMobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0",
                    isSidebarCollapsed ? "w-16" : "w-66",
                    className,
                )}
            >
                {isSidebarCollapsed ? (
                    <CollapsedSidebar
                        pathname={pathname}
                        projects={projects}
                        currentProjectId={currentProjectId}
                        workspaceLoading={workspaceLoading}
                        agents={agents}
                        onCreateProject={async (request) => (await createProject(request)).data}
                        onOpenCommand={() => setIsCommandOpen(true)}
                        onExpand={() => setIsSidebarCollapsed(false)}
                        onProjectSelect={(projectId) => {
                            setOpenProjectId(projectId);
                            setIsSidebarCollapsed(false);
                        }}
                    />
                ) : (
                    <ExpandedSidebar
                        pathname={pathname}
                        projects={projects}
                        openProjectId={openProjectId}
                        workspaceLoading={workspaceLoading}
                        agents={agents}
                        onCreateProject={async (request) => (await createProject(request)).data}
                        onOpenCommand={() => setIsCommandOpen(true)}
                        onCollapse={() => setIsSidebarCollapsed(true)}
                        onToggleProject={(projectId) =>
                            setOpenProjectId((current) =>
                                current === projectId ? null : projectId,
                            )
                        }
                    />
                )}
            </aside>
        </>
    );
}

function ExpandedSidebar({
    pathname,
    projects,
    openProjectId,
    workspaceLoading,
    agents,
    onCreateProject,
    onOpenCommand,
    onCollapse,
    onToggleProject,
}: {
    pathname: string;
    projects: ActorProject[];
    openProjectId: string | null;
    workspaceLoading: boolean;
    agents: Agent[];
    onCreateProject: (request: {
        name: string;
        agent_id: string;
        description?: string;
    }) => Promise<ActorProject>;
    onOpenCommand: () => void;
    onCollapse: () => void;
    onToggleProject: (projectId: string) => void;
}) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex h-12 items-center justify-between border-b border-sidebar-border/70 px-2.5">
                <div className="min-w-0">
                    <div className="text-sm text-foreground">Agents</div>
                </div>
                <button
                    type="button"
                    onClick={onCollapse}
                    className={shellButtonClass}
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                >
                    <IconLayoutSidebarLeftCollapse size={15} stroke={1.8} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2.5">
                <div className="space-y-3">
                    <SidebarSection>
                        <button
                            type="button"
                            onClick={onOpenCommand}
                            className="flex h-8 w-full items-center justify-between rounded-md bg-accent/45 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <span className="flex items-center gap-2">
                                <IconSearch size={14} stroke={1.9} />
                                <span>Search or jump</span>
                            </span>
                            <span className="rounded-sm bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground">
                                ⌘K
                            </span>
                        </button>
                    </SidebarSection>

                    <SidebarSection>
                        <div className="space-y-1">
                            <TopLevelLink
                                href="/agents"
                                icon={<IconCompass size={15} stroke={1.9} />}
                                label="Explorer"
                                active={pathname === "/agents"}
                            />
                            <TopLevelLink
                                href="/agents/integrations"
                                icon={<IconConnection size={15} stroke={1.9} />}
                                label="Integrations"
                                active={pathname === "/agents/integrations"}
                            />
                        </div>
                    </SidebarSection>

                    <SidebarSection>
                        <div className="mb-1.5 flex items-center justify-between px-0.5">
                            <div className="text-sm text-muted-foreground">
                                Projects
                            </div>
                            <CreateProjectDialog
                                agents={agents}
                                onCreate={async (request) => {
                                    await onCreateProject(request);
                                }}
                                trigger={
                                    <button
                                        type="button"
                                        className={shellButtonClass}
                                        aria-label="Create project"
                                        title="Create project"
                                    >
                                        <IconPlus size={15} stroke={2.1} />
                                    </button>
                                }
                            />
                        </div>

                        {workspaceLoading ? (
                            <div className="space-y-1 px-1">
                                <Skeleton className="h-7 w-full rounded-md bg-accent/20" />
                                <Skeleton className="h-7 w-5/6 rounded-md bg-accent/20" />
                                <Skeleton className="h-7 w-4/5 rounded-md bg-accent/20" />
                            </div>
                        ) : projects.length > 0 ? (
                            <div className="space-y-1.5">
                                {projects.map((project) => (
                                    <ProjectSection
                                        key={project.id}
                                        project={project}
                                        pathname={pathname}
                                        isOpen={openProjectId === project.id}
                                        onToggle={() =>
                                            onToggleProject(project.id)
                                        }
                                        isThreadActive={(thread) =>
                                            pathname ===
                                                `/agents/threads/${thread.id}` ||
                                            pathname ===
                                                `/agents/c/${thread.id}` ||
                                            pathname.startsWith(
                                                `/agents/threads/${thread.id}/`,
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No projects yet.
                            </div>
                        )}
                    </SidebarSection>
                </div>
            </div>
        </div>
    );
}

function CollapsedSidebar({
    pathname,
    projects,
    currentProjectId,
    workspaceLoading,
    agents,
    onCreateProject,
    onOpenCommand,
    onExpand,
    onProjectSelect,
}: {
    pathname: string;
    projects: ActorProject[];
    currentProjectId: string | null;
    workspaceLoading: boolean;
    agents: Agent[];
    onCreateProject: (request: {
        name: string;
        agent_id: string;
        description?: string;
    }) => Promise<ActorProject>;
    onOpenCommand: () => void;
    onExpand: () => void;
    onProjectSelect: (projectId: string) => void;
}) {
    return (
        <div className="flex h-full flex-col items-center gap-2 px-1.5 py-2.5">
            <button
                type="button"
                onClick={onExpand}
                className={shellButtonClass}
                aria-label="Expand sidebar"
                title="Expand sidebar"
            >
                <IconLayoutSidebarLeftExpand size={15} stroke={1.8} />
            </button>

            <Link
                href="/agents"
                className={cn(
                    shellButtonClass,
                    pathname === "/agents" && primaryNavItemActiveClass,
                )}
                title="Explorer"
            >
                <IconCompass size={16} stroke={1.9} />
            </Link>

            <Link
                href="/agents/integrations"
                className={cn(
                    shellButtonClass,
                    pathname === "/agents/integrations" && primaryNavItemActiveClass,
                )}
                title="Integrations"
            >
                <IconConnection size={16} stroke={1.9} />
            </Link>

            <button
                type="button"
                onClick={onOpenCommand}
                className={shellButtonClass}
                title="Search or jump"
                aria-label="Search or jump"
            >
                <IconSearch size={16} stroke={1.9} />
            </button>

            <CreateProjectDialog
                agents={agents}
                onCreate={async (request) => {
                    await onCreateProject(request);
                }}
                trigger={
                    <button
                        type="button"
                        className={shellButtonClass}
                        aria-label="Create project"
                        title="Create project"
                    >
                        <IconPlus size={16} stroke={2.1} />
                    </button>
                }
            />

            <div className="mt-1.5 flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto pb-2">
                {workspaceLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton
                              key={index}
                              className="size-7 rounded-md bg-accent/20"
                          />
                      ))
                    : projects.map((project) => {
                          const isActive =
                              currentProjectId === project.id ||
                              pathname.startsWith(`/agents/p/${project.id}`);

                          return (
                              <button
                                  key={project.id}
                                  type="button"
                                  onClick={() => onProjectSelect(project.id)}
                                  className={cn(
                                      shellButtonClass,
                                      isActive && primaryNavItemActiveClass,
                                  )}
                                  title={project.name}
                              >
                                  <span className="text-sm text-foreground">
                                      {initials(project.name)}
                                  </span>
                              </button>
                          );
                      })}
            </div>
        </div>
    );
}

function SidebarSection({ children }: { children: React.ReactNode }) {
    return <section>{children}</section>;
}

function TopLevelLink({
    href,
    icon,
    label,
    active,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                primaryNavItemClass,
                active && primaryNavItemActiveClass,
            )}
        >
            <span className="shrink-0 text-muted-foreground">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}

function ProjectSection({
    project,
    pathname,
    isOpen,
    onToggle,
    isThreadActive,
}: {
    project: ActorProject;
    pathname: string;
    isOpen: boolean;
    onToggle: () => void;
    isThreadActive: (thread: AgentThread) => boolean;
}) {
    const router = useRouter();
    const [showArchived, setShowArchived] = React.useState(false);
    const [mutatingThreadId, setMutatingThreadId] = React.useState<
        string | null
    >(null);
    const { threads, hasMore, loadMore, refetch } = useProjectThreadFeed(
        project.id,
        {
            enabled: isOpen,
            limit: 10,
        },
    );
    const {
        threads: archivedThreads,
        hasMore: archivedHasMore,
        loadMore: loadMoreArchived,
        refetch: refetchArchived,
    } = useProjectThreadFeed(project.id, {
        enabled: isOpen && showArchived,
        archivedOnly: true,
        limit: 10,
    });
    const { archiveThread, unarchiveThread } = useProjectThreads(project.id, {
        enabled: false,
    });

    const toggleThreadArchived = React.useCallback(
        async (thread: AgentThread) => {
            if (mutatingThreadId) return;
            setMutatingThreadId(thread.id);
            try {
                if (thread.archived_at) {
                    await unarchiveThread(thread.id);
                } else {
                    await archiveThread(thread.id);
                }
                await Promise.all([refetch(), refetchArchived()]);
            } finally {
                setMutatingThreadId(null);
            }
        },
        [
            archiveThread,
            mutatingThreadId,
            refetch,
            refetchArchived,
            unarchiveThread,
        ],
    );

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1 px-0.5">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex h-8 min-w-0 flex-1 items-center rounded-md text-left text-sm text-foreground transition-colors"
                >
                    <div className="min-w-0 flex-1 truncate">
                        {project.name}
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            `/agents/c/new?projectId=${encodeURIComponent(project.id)}`,
                        )
                    }
                    className={shellButtonClass}
                    aria-label={`New chat in ${project.name}`}
                    title="New chat"
                >
                    <IconPlus size={15} stroke={2.1} />
                </button>
            </div>

            {isOpen ? (
                <div className="ml-2.5 space-y-1 border-l border-border/50 pl-2">
                    <NestedLink
                        href={`/agents/p/${project.id}/tasks`}
                        active={pathname.startsWith(
                            `/agents/p/${project.id}/tasks`,
                        )}
                        icon={<IconChecklist size={13} stroke={1.8} />}
                        label="Task Board"
                    />
                    {threads.length > 0 ? (
                        <div className="space-y-0.5">
                            {threads.map((thread: AgentThread) => (
                                <ThreadLink
                                    key={thread.id}
                                    thread={thread}
                                    active={isThreadActive(thread)}
                                    mutating={mutatingThreadId === thread.id}
                                    onToggleArchived={() => {
                                        void toggleThreadArchived(thread);
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}

                    {hasMore ? (
                        <button
                            type="button"
                            onClick={() => {
                                void loadMore();
                            }}
                            className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            Load more
                        </button>
                    ) : null}

                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() =>
                                setShowArchived((current) => !current)
                            }
                            className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <Archive size={13} strokeWidth={1.8} />
                            <span>
                                {showArchived
                                    ? "Hide archived"
                                    : "Archived threads"}
                            </span>
                        </button>

                        {showArchived ? (
                            <div className="mt-1 ml-2.5 space-y-0.5 border-l border-border/50 pl-2">
                                {archivedThreads.length > 0 ? (
                                    archivedThreads.map(
                                        (thread: AgentThread) => (
                                            <ThreadLink
                                                key={thread.id}
                                                thread={thread}
                                                active={isThreadActive(thread)}
                                                mutating={
                                                    mutatingThreadId ===
                                                    thread.id
                                                }
                                                onToggleArchived={() => {
                                                    void toggleThreadArchived(
                                                        thread,
                                                    );
                                                }}
                                            />
                                        ),
                                    )
                                ) : (
                                    <div className="px-2 py-1 text-sm text-muted-foreground">
                                        No archived threads
                                    </div>
                                )}

                                {archivedHasMore ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void loadMoreArchived();
                                        }}
                                        className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        Load more
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function NestedLink({
    href,
    active,
    icon,
    label,
}: {
    href: string;
    active: boolean;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                nestedNavItemClass,
                active && nestedNavItemActiveClass,
            )}
        >
            <span className="shrink-0 text-muted-foreground">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}

function ThreadLink({
    thread,
    active,
    mutating,
    onToggleArchived,
}: {
    thread: AgentThread;
    active: boolean;
    mutating?: boolean;
    onToggleArchived: () => void;
}) {
    const label =
        thread.title ||
        thread.responsibility ||
        `thread-${thread.id.slice(0, 6)}`;
    const href =
        thread.thread_purpose === "conversation"
            ? `/agents/c/${thread.id}`
            : `/agents/threads/${thread.id}`;
    const threadIcon = (() => {
        switch (thread.thread_purpose) {
            case "conversation":
                return <MessageSquare size={13} strokeWidth={1.8} />;
            case "coordinator":
                return <GitBranch size={13} strokeWidth={1.8} />;
            case "review":
                return <ClipboardCheck size={13} strokeWidth={1.8} />;
            case "execution":
                return <Zap size={13} strokeWidth={1.8} />;
            default:
                return <StatusDot status={thread.status} />;
        }
    })();
    const canToggleArchived =
        !["execution", "review"].includes(thread.thread_purpose) ||
        Boolean(thread.archived_at);

    return (
        <div className="group flex items-center gap-1">
            <Link
                href={href}
                className={cn(
                    "min-w-0 flex-1",
                    nestedNavItemClass,
                    active && nestedNavItemActiveClass,
                )}
            >
                <span className="shrink-0 text-muted-foreground">
                    {threadIcon}
                </span>
                <span className="truncate">{label}</span>
                {[
                    "conversation",
                    "coordinator",
                    "review",
                    "execution",
                ].includes(thread.thread_purpose) ? (
                    <span className="ml-auto shrink-0">
                        <StatusDot status={thread.status} />
                    </span>
                ) : null}
            </Link>
            {canToggleArchived ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleArchived();
                    }}
                    disabled={mutating}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-100 group-hover:opacity-100"
                    aria-label={
                        thread.archived_at
                            ? "Unarchive thread"
                            : "Archive thread"
                    }
                    title={
                        thread.archived_at
                            ? "Unarchive thread"
                            : "Archive thread"
                    }
                >
                    {thread.archived_at ? (
                        <ArchiveRestore size={13} strokeWidth={1.8} />
                    ) : (
                        <Archive size={13} strokeWidth={1.8} />
                    )}
                </button>
            ) : null}
        </div>
    );
}
