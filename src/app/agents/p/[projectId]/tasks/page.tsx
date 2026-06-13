"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useActorProjects, useProjectTasks } from "@wacht/nextjs";
import type { ActorProject, ProjectTaskBoardItem } from "@wacht/types";
import {
    IconPlus,
    IconChecklist,
    IconChevronRight,
    IconSearch,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { CreateTaskDialog } from "@/components/agent/task-board-dialogs";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatRelativeDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const future = diff < 0;
    const absDiff = Math.abs(diff);
    const minutes = Math.floor(absDiff / (1000 * 60));
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

    if (future) {
        if (minutes < 1) return "in <1m";
        if (minutes < 60) return `in ${minutes}m`;
        if (hours < 24) return `in ${hours}h`;
        if (days < 7) return `in ${days}d`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

const STATUS_GROUPS = {
    open: ["pending", "available"],
    active: ["claimed", "in_progress"],
    waiting: ["needs_clarification", "waiting_for_children"],
    blocked: ["blocked"],
    done: ["completed"],
    closed: ["rejected", "cancelled", "failed"],
} as const;

type TaskFilter = "all" | "active" | "blocked" | "done";

const TASK_FILTERS: { id: TaskFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "blocked", label: "Blocked" },
    { id: "done", label: "Done" },
];

function statusOf(task: ProjectTaskBoardItem) {
    return task.status || "pending";
}

function matchesFilter(task: ProjectTaskBoardItem, filter: TaskFilter) {
    if (filter === "all") return true;
    const status = statusOf(task);
    if (filter === "active") {
        return (
            (STATUS_GROUPS.active as readonly string[]).includes(status) ||
            (STATUS_GROUPS.open as readonly string[]).includes(status) ||
            (STATUS_GROUPS.waiting as readonly string[]).includes(status)
        );
    }
    if (filter === "blocked") {
        return (
            (STATUS_GROUPS.blocked as readonly string[]).includes(status) ||
            (STATUS_GROUPS.waiting as readonly string[]).includes(status)
        );
    }
    if (filter === "done") {
        return (STATUS_GROUPS.done as readonly string[]).includes(status);
    }
    return true;
}

/** Map a task status to its pill variant + dot color used in the design. */
function statusPresentation(status: string): {
    pill: string;
    dot: string;
    dotc: string;
} {
    if ((STATUS_GROUPS.done as readonly string[]).includes(status)) {
        return {
            pill: "border-success/30 bg-success-soft text-success",
            dot: "bg-success",
            dotc: "bg-success",
        };
    }
    if (
        (STATUS_GROUPS.blocked as readonly string[]).includes(status) ||
        (STATUS_GROUPS.waiting as readonly string[]).includes(status)
    ) {
        return {
            pill: "border-warning/30 bg-warning-soft text-warning",
            dot: "bg-warning",
            dotc: "bg-warning",
        };
    }
    if ((STATUS_GROUPS.active as readonly string[]).includes(status)) {
        return { pill: "", dot: "bg-info", dotc: "bg-info" };
    }
    if ((STATUS_GROUPS.closed as readonly string[]).includes(status)) {
        return { pill: "", dot: "bg-error", dotc: "bg-error" };
    }
    return { pill: "", dot: "bg-faint", dotc: "bg-faint" };
}

function taskKey(task: ProjectTaskBoardItem) {
    return task.task_key || `TSK-${task.id.slice(0, 4)}`;
}

function assigneeInitials(task: ProjectTaskBoardItem) {
    const thread = task.assigned_thread_id;
    if (!thread) return "—";
    return thread.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "—";
}

function assigneeName(task: ProjectTaskBoardItem) {
    if (!task.assigned_thread_id) return "Unassigned";
    return `Thread ${task.assigned_thread_id.slice(0, 8)}`;
}

function TasksLoading() {
    return (
        <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-24 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-64 rounded" />
        </div>
    );
}

export default function ProjectTasksPage() {
    const params = useParams<{ projectId: string }>();
    const projectId = params?.projectId;
    const { hasSession } = useActiveAgent();
    const { projects, loading: projectsLoading } = useActorProjects({
        enabled: hasSession,
    });
    const project =
        projects.find((item: ActorProject) => item.id === projectId) || null;
    const {
        tasks: activeTasks,
        loading: activeTasksLoading,
        error: activeTasksError,
        hasMore: activeHasMore,
        loadingMore: activeLoadingMore,
        loadMore: loadMoreActiveTasks,
        createTask,
    } = useProjectTasks(projectId, !!projectId, {
        limit: 72,
    });

    const [filter, setFilter] = React.useState<TaskFilter>("all");
    const [query, setQuery] = React.useState("");

    const counts = React.useMemo(() => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let open = 0;
        let active = 0;
        let blocked = 0;
        let done = 0;
        for (const task of activeTasks) {
            const status = statusOf(task);
            if ((STATUS_GROUPS.open as readonly string[]).includes(status)) open += 1;
            if ((STATUS_GROUPS.active as readonly string[]).includes(status))
                active += 1;
            if (
                (STATUS_GROUPS.blocked as readonly string[]).includes(status) ||
                (STATUS_GROUPS.waiting as readonly string[]).includes(status)
            )
                blocked += 1;
            if ((STATUS_GROUPS.done as readonly string[]).includes(status)) {
                const completedAt = task.completed_at || task.updated_at;
                if (completedAt && new Date(completedAt).getTime() >= sevenDaysAgo)
                    done += 1;
            }
        }
        return { open, active, blocked, done };
    }, [activeTasks]);

    const visibleTasks = React.useMemo(() => {
        const needle = query.trim().toLowerCase();
        return activeTasks.filter((task: ProjectTaskBoardItem) => {
            if (!matchesFilter(task, filter)) return false;
            if (!needle) return true;
            return (
                task.title.toLowerCase().includes(needle) ||
                taskKey(task).toLowerCase().includes(needle) ||
                (task.description || "").toLowerCase().includes(needle)
            );
        });
    }, [activeTasks, filter, query]);

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
                <Skeleton className="h-32 rounded" />
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
    if (activeTasksError) {
        return (
            <PageState
                title="Failed to load tasks"
                description="The task board could not be loaded."
            />
        );
    }

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
            />

            <div className="flex-1 overflow-y-auto">
                {activeTasksLoading ? (
                    <TasksLoading />
                ) : (
                    <div className="w-full px-5 py-5 md:px-[30px] md:py-[26px]">
                        {/* ab-head */}
                        <div className="mb-[18px] flex items-start justify-between gap-6">
                            <div className="min-w-0">
                                <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                                    Project · {project.name}
                                </div>
                                <h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                                    Tasks
                                </h1>
                                <p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
                                    Work queued for this project&apos;s agents,
                                    newest first.
                                </p>
                            </div>
                            <CreateTaskDialog
                                onCreate={async (request, files) => {
                                    await createTask(request, files);
                                }}
                                trigger={
                                    <Button size="sm">
                                        <IconPlus size={14} stroke={2.5} />
                                        New task
                                    </Button>
                                }
                            />
                        </div>

                        {/* Queue snapshot */}
                        <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                            <div className="border-b border-border px-[18px] py-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                Queue
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
                                <SnapCell
                                    k="open"
                                    v={counts.open}
                                    f="awaiting pickup"
                                />
                                <SnapCell
                                    k="in progress"
                                    v={counts.active}
                                    vClass="text-info"
                                    f={`${counts.active} agent${counts.active === 1 ? "" : "s"} active`}
                                />
                                <SnapCell
                                    k="blocked"
                                    v={counts.blocked}
                                    vClass="text-warning"
                                    f="waiting on review"
                                />
                                <SnapCell
                                    k="done · 7d"
                                    v={counts.done}
                                    vClass="text-success"
                                    f="completed recently"
                                />
                            </div>
                        </div>

                        {/* Filter row */}
                        <div className="my-5 mb-3 flex items-center gap-2">
                            <div className="inline-flex gap-0.5 rounded-[8px] border border-border bg-secondary p-[3px]">
                                {TASK_FILTERS.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setFilter(item.id)}
                                        className={cn(
                                            "h-7 rounded-[6px] px-[13px] text-[12px] font-medium text-muted-foreground",
                                            filter === item.id &&
                                                "bg-card text-foreground shadow-[0_0_0_0.5px_var(--wa-border-strong)]",
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1" />
                            <div className="relative w-[220px]">
                                <IconSearch
                                    size={14}
                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
                                />
                                <Input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Search tasks…"
                                    className="h-9 pl-[30px]"
                                />
                            </div>
                        </div>

                        {/* Task list */}
                        <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                            <div className="overflow-x-auto">
                                <div className="min-w-[760px]">
                                    <div className="grid grid-cols-[8px_92px_1fr_158px_104px_80px_20px] items-center gap-[14px] border-b border-border bg-secondary px-[18px] py-[10px] font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                        <span />
                                        <span>Task</span>
                                        <span>Title</span>
                                        <span>Assignee</span>
                                        <span>Status</span>
                                        <span className="text-right">Updated</span>
                                        <span />
                                    </div>

                                    {visibleTasks.length === 0 ? (
                                        <div className="px-[18px] py-12 text-center text-[13px] text-muted-foreground">
                                            No tasks match this view.
                                        </div>
                                    ) : (
                                        visibleTasks.map(
                                            (task: ProjectTaskBoardItem) => (
                                                <TaskRow
                                                    key={task.id}
                                                    task={task}
                                                    href={`/agents/p/${projectId}/tasks/${task.id}`}
                                                />
                                            ),
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {activeHasMore || activeLoadingMore ? (
                            <div className="mt-4 flex justify-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void loadMoreActiveTasks()}
                                    disabled={activeLoadingMore}
                                >
                                    {activeLoadingMore
                                        ? "Loading…"
                                        : "Load more tasks"}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

function SnapCell({
    k,
    v,
    f,
    vClass,
}: {
    k: string;
    v: number;
    f: string;
    vClass?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {k}
            </div>
            <div
                className={cn(
                    "text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground",
                    vClass,
                )}
            >
                {v}
            </div>
            <div className="font-mono text-[11px] leading-[1.4] text-faint">
                {f}
            </div>
        </div>
    );
}

function shouldIgnoreRowNavigation(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return !!target.closest("button, a");
}

function TaskRow({
    task,
    href,
}: {
    task: ProjectTaskBoardItem;
    href: string;
}) {
    const router = useRouter();
    const status = statusOf(task);
    const presentation = statusPresentation(status);
    const initials = assigneeInitials(task);

    return (
        <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
                if (shouldIgnoreRowNavigation(event.target)) return;
                router.push(href);
            }}
            onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (shouldIgnoreRowNavigation(event.target)) return;
                event.preventDefault();
                router.push(href);
            }}
            className="grid cursor-pointer grid-cols-[8px_92px_1fr_158px_104px_80px_20px] items-center gap-[14px] border-b border-border px-[18px] py-[13px] last:border-b-0 hover:bg-secondary"
        >
            <span
                className={cn("size-[7px] rounded-full", presentation.dotc)}
            />
            <span className="truncate font-mono text-[11px] font-medium text-muted-foreground">
                {taskKey(task)}
            </span>
            <span className="truncate text-[13px] font-medium leading-[1.3] text-foreground">
                {task.title}
            </span>
            <span className="flex min-w-0 items-center gap-2">
                <span className="grid size-[22px] flex-none place-items-center rounded-full bg-primary/10 font-medium text-[10px] text-primary">
                    {initials}
                </span>
                <span className="truncate text-[12px] text-foreground-secondary">
                    {assigneeName(task)}
                </span>
            </span>
            <span
                className={cn(
                    "inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2 font-mono text-[11px] font-medium lowercase text-foreground-secondary",
                    presentation.pill,
                )}
            >
                <span
                    className={cn(
                        "size-[6px] rounded-full",
                        presentation.dot,
                    )}
                />
                {status.replace(/_/g, " ")}
            </span>
            <span className="text-right font-mono text-[11px] text-muted-foreground">
                {formatRelativeDate(task.updated_at)}
            </span>
            <IconChevronRight
                size={14}
                className="justify-self-end text-faint"
            />
        </div>
    );
}
