"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    useActorProjects,
    useProjectTasks,
    useProjectThreads,
} from "@wacht/nextjs";
import type {
    ActorProject,
    AgentThread,
    ProjectTaskBoardItem,
} from "@wacht/types";
import { IconArrowRight, IconChecklist, IconClock } from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { ThreadPendingActionPanel } from "@/components/agent/thread-pending-action-panel";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function sortThreads(threads: AgentThread[]) {
    return [...threads].sort((a, b) => {
        const aTime = new Date(a.last_activity_at || a.updated_at).getTime();
        const bTime = new Date(b.last_activity_at || b.updated_at).getTime();
        return bTime - aTime;
    });
}

function sortTasks(items: ProjectTaskBoardItem[]) {
    return [...items].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return bTime - aTime;
    });
}

function formatTimestamp(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectReviewPage() {
    const params = useParams<{ projectId: string }>();
    const projectId = params?.projectId;
    const { hasSession } = useActiveAgent();
    const { projects, loading: projectsLoading } = useActorProjects({
        enabled: hasSession,
    });
    const project =
        projects.find((item: ActorProject) => item.id === projectId) || null;
    const {
        tasks,
        loading: tasksLoading,
        error: tasksError,
        hasMore,
        loadingMore,
        loadMore,
    } = useProjectTasks(projectId, !!projectId, {
        statuses: ["awaiting_review"],
        limit: 40,
    });
    const {
        threads,
        loading: threadsLoading,
        error: threadsError,
    } = useProjectThreads(projectId, { enabled: !!projectId });

    const activeThreads = React.useMemo(
        () => sortThreads(threads).filter((thread) => !thread.archived_at),
        [threads],
    );
    const waitingThreads = React.useMemo(
        () =>
            activeThreads.filter(
                (thread) =>
                    thread.status === "waiting_for_input" ||
                    thread.status === "interrupted",
            ),
        [activeThreads],
    );
    const reviewTasks = React.useMemo(
        () =>
            sortTasks(tasks).filter(
                (task) => (task.status || "pending") === "awaiting_review",
            ),
        [tasks],
    );
    if (!hasSession) {
        return (
            <PageState
                title="No session"
                description="Open via a valid agent session link."
            />
        );
    }
    if (projectsLoading) {
        return (
            <div className="flex h-full flex-col space-y-4 bg-background p-8">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-40 rounded" />
                <Skeleton className="h-64 rounded" />
            </div>
        );
    }
    if (!projectId || !project) {
        return (
            <PageState
                title="Project not found"
                description="The requested project could not be resolved."
            />
        );
    }

    const loading = tasksLoading || threadsLoading;
    const error = tasksError || threadsError;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background font-normal text-foreground">
            <AgentNavbar
                left={
                    <div className="flex items-center gap-2">
                        <IconChecklist
                            size={13}
                            stroke={2}
                            className="text-muted-foreground"
                        />
                        <span className="text-sm font-normal">
                            {project.name}
                        </span>
                    </div>
                }
                right={
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{waitingThreads.length} threads</span>
                        <span>{reviewTasks.length} tasks</span>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-5">
                        <Skeleton className="h-[220px] rounded-lg" />
                        <Skeleton className="h-[260px] rounded-lg" />
                        <Skeleton className="h-[260px] rounded-lg" />
                    </div>
                ) : error ? (
                    <PageState
                        title="Failed to load review state"
                        description="The review queue could not be loaded."
                    />
                ) : (
                    <div className="flex w-full flex-col gap-6 px-4 py-4 md:px-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <SummaryTile
                                label="Needs Input"
                                value={waitingThreads.length}
                            />
                            <SummaryTile
                                label="Awaiting Review"
                                value={reviewTasks.length}
                            />
                        </div>

                        <ReviewSection
                            title="Needs Input"
                            count={waitingThreads.length}
                            icon={
                                <IconClock
                                    size={14}
                                    stroke={1.8}
                                    className="text-muted-foreground"
                                />
                            }
                        >
                            {waitingThreads.length === 0 ? (
                                <EmptyState
                                    title="Nothing waiting"
                                    description="No threads currently need user input."
                                />
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {waitingThreads.map((thread) => (
                                        <ThreadReviewRow
                                            key={thread.id}
                                            thread={thread}
                                        />
                                    ))}
                                </div>
                            )}
                        </ReviewSection>

                        <ReviewSection
                            title="Awaiting Review"
                            count={reviewTasks.length}
                            icon={
                                <IconChecklist
                                    size={14}
                                    stroke={1.8}
                                    className="text-muted-foreground"
                                />
                            }
                        >
                            {reviewTasks.length === 0 ? (
                                <EmptyState
                                    title="No tasks waiting"
                                    description="Nothing is currently awaiting review."
                                />
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {reviewTasks.map((task) => (
                                        <TaskReviewRow
                                            key={task.id}
                                            task={task}
                                            projectId={projectId}
                                        />
                                    ))}
                                </div>
                            )}
                        </ReviewSection>

                        {hasMore || loadingMore ? (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void loadMore()}
                                    disabled={loadingMore}
                                    className="h-8 rounded-md border border-border/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                                >
                                    {loadingMore
                                        ? "Loading..."
                                        : "Load More Tasks"}
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-border/60 px-3 py-3">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-normal text-foreground">
                {value}
            </div>
        </div>
    );
}

function ReviewSection({
    title,
    count,
    icon,
    className,
    children,
}: {
    title: string;
    count: number;
    icon: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                "overflow-hidden rounded-lg border border-border/60 bg-background",
                className,
            )}
        >
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm text-foreground">{title}</span>
                </div>
                <span className="text-sm text-muted-foreground">{count}</span>
            </div>
            {children}
        </section>
    );
}

function ThreadReviewRow({ thread }: { thread: AgentThread }) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className="bg-background">
            <div
                onClick={() => setIsExpanded((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setIsExpanded((current) => !current);
                    }
                }}
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/20"
            >
                <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500/80" />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-foreground">
                            {thread.title ||
                                thread.responsibility ||
                                `Thread ${thread.id.substring(0, 8)}`}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{thread.status.replace(/_/g, " ")}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>
                            {formatTimestamp(
                                thread.last_activity_at || thread.updated_at,
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div
                        className={cn(
                            "transition-transform duration-200",
                            isExpanded && "rotate-90",
                        )}
                    >
                        <IconArrowRight
                            size={13}
                            stroke={1.7}
                            className="text-muted-foreground"
                        />
                    </div>
                </div>
            </div>

            {isExpanded ? (
                <div className="border-t border-border/50 px-3 py-3">
                    <ThreadPendingActionPanel threadId={thread.id} compact />
                </div>
            ) : null}
        </div>
    );
}

function TaskReviewRow({
    task,
    projectId,
}: {
    task: ProjectTaskBoardItem;
    projectId: string;
}) {
    return (
        <Link
            href={`/agents/p/${projectId}/tasks/${task.id}`}
            className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/20"
        >
            <div
                className={cn(
                    "h-2 w-2 shrink-0 rounded-full bg-emerald-500/80",
                )}
            />

            <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">
                    {task.title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.task_key || `TSK-${task.id.slice(0, 4)}`}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>{task.status.replace(/_/g, " ")}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>{formatTimestamp(task.updated_at)}</span>
                </div>
            </div>

            <span className="text-sm text-muted-foreground">Open</span>
        </Link>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-[120px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
