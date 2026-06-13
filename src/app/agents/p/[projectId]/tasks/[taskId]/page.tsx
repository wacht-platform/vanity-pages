"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useActorProjects, useProjectTaskBoardItem } from "@wacht/nextjs";
import type {
    ActorProject,
    ProjectTaskBoardItemAssignment,
    ProjectTaskBoardItem,
    ProjectTaskDeliverable,
    ProjectTaskSchedule,
    ProjectTaskWorkspaceFileEntry,
} from "@wacht/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    IconArchive,
    IconChecklist,
    IconChevronDown,
    IconChevronUp,
    IconChevronRight,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { EditTaskDialog } from "@/components/agent/task-board-dialogs";
import { PendingQuestionCard } from "@/components/agent/pending-question-card";
import { TaskApprovalCard } from "@/components/agent/task-approval-card";
import { TaskWorkspaceExplorer } from "@/components/agent/task-workspace-explorer";
import { TaskCommentsPanel } from "@/components/agent/task-comments-panel";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";

type TaskPaneSelection = { kind: "assignment"; assignmentId: string };

type TaskSurfaceTab = "assignments" | "deliverables" | "files" | "comments";

const WORKSPACE_PATH_PATTERN = /\/(?:task|workspace)\/[A-Za-z0-9._/-]+/g;
const WORKSPACE_PATH_CHECK_PATTERN = /^\/(?:task|workspace)\/[A-Za-z0-9._/-]+$/;
const WORKSPACE_TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]]+$/;

const DOCUMENT_PROSE_CLASSNAME =
    "prose prose-sm prose-invert max-w-none text-sm leading-6 text-muted-foreground font-normal " +
    "prose-p:whitespace-pre-wrap prose-p:text-muted-foreground prose-li:text-muted-foreground prose-ul:my-1 prose-li:my-0 " +
    "prose-strong:text-foreground prose-a:text-foreground prose-code:text-foreground prose-code:bg-accent/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-normal " +
    "prose-pre:bg-accent/20 prose-pre:border prose-pre:border-divider/50 prose-pre:rounded-md " +
    "[&_h1]:text-base [&_h1]:font-medium [&_h1]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3 " +
    "[&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:mt-5 [&_h2]:mb-2 " +
    "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-muted-foreground [&_h3]:mt-4 [&_h3]:mb-1";

type MarkdownNode = {
    type: string;
    value?: string;
    url?: string;
    title?: string | null;
    children?: MarkdownNode[];
};

function formatTime(value?: string) {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
        .format(new Date(value))
        .toLowerCase();
}

function timestampValue(value?: string) {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function formatLabel(value?: string) {
    if (!value) return "Unknown";
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAssignmentStatus(assignment: ProjectTaskBoardItemAssignment) {
    if (assignment.result_status) {
        return `${formatLabel(assignment.status)} · ${formatLabel(assignment.result_status)}`;
    }
    return formatLabel(assignment.status);
}

const STATUS_PILL_KIND: Record<string, "ok" | "warn" | "info" | "err"> = {
    completed: "ok",
    failed: "err",
    blocked: "warn",
    rejected: "err",
    cancelled: "err",
    in_progress: "info",
    claimed: "info",
    available: "warn",
    pending: "warn",
    needs_clarification: "warn",
    waiting_for_children: "warn",
};

const PILL_KIND_CLASS: Record<"ok" | "warn" | "info" | "err", string> = {
    ok: "border-success/30 bg-success-soft text-success",
    warn: "border-warning/30 bg-warning-soft text-warning",
    info: "",
    err: "",
};

const PILL_DOT_CLASS: Record<"ok" | "warn" | "info" | "err", string> = {
    ok: "bg-success",
    warn: "bg-warning",
    info: "bg-info",
    err: "bg-error",
};

function statusHueClass(status?: string) {
    const kind = STATUS_PILL_KIND[status || ""];
    if (kind === "ok") return "text-success";
    if (kind === "warn") return "text-warning";
    if (kind === "info") return "text-info";
    return "";
}

const DOT_COLOR_CLASS: Record<string, string> = {
    completed: "bg-success",
    failed: "bg-error",
    blocked: "bg-error",
    rejected: "bg-error",
    cancelled: "bg-muted-foreground/60",
    in_progress: "bg-info",
    claimed: "bg-info",
    available: "bg-warning",
    pending: "bg-warning",
    needs_clarification: "bg-warning",
    waiting_for_children: "bg-warning",
};

function dotColorClass(status?: string) {
    return DOT_COLOR_CLASS[status || ""] || "bg-faint";
}

function formatDuration(startValue?: string, endValue?: string) {
    const start = timestampValue(startValue);
    if (!start) return "—";
    const end = timestampValue(endValue);
    if (!end || end < start) return "—";
    const seconds = (end - start) / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
}

function normalizeWorkspacePath(value: unknown) {
    if (typeof value !== "string") return null;
    if (value.startsWith("/task/")) return value.slice("/task/".length);
    if (value.startsWith("/workspace/")) return value.slice(1);
    return value;
}

function isWorkspacePath(value: unknown): value is string {
    return (
        typeof value === "string" && WORKSPACE_PATH_CHECK_PATTERN.test(value)
    );
}

function splitWorkspacePathSuffix(value: string) {
    const trimmedPath = value.replace(
        WORKSPACE_TRAILING_PUNCTUATION_PATTERN,
        "",
    );
    return {
        path: trimmedPath,
        trailing: value.slice(trimmedPath.length),
    };
}

function workspaceLinkHref(path: string) {
    if (path.startsWith("/task/") || path.startsWith("/workspace/")) {
        return path;
    }
    return `/task/${path.replace(/^\/+/, "")}`;
}

function resolveWorkspaceHref(href?: string | null) {
    if (!href) return null;
    if (href.startsWith("/task/") || href.startsWith("/workspace/")) {
        return href;
    }
    return null;
}

function splitTextIntoWorkspaceLinkNodes(value: string): MarkdownNode[] {
    const matches = [...value.matchAll(WORKSPACE_PATH_PATTERN)];
    if (matches.length === 0) {
        return [{ type: "text", value }];
    }

    const nodes: MarkdownNode[] = [];
    let cursor = 0;

    for (const match of matches) {
        const matchedPath = match[0];
        const index = match.index ?? 0;
        const { path, trailing } = splitWorkspacePathSuffix(matchedPath);

        if (index > cursor) {
            nodes.push({ type: "text", value: value.slice(cursor, index) });
        }

        if (path) {
            nodes.push({
                type: "link",
                url: workspaceLinkHref(path),
                title: null,
                children: [{ type: "text", value: path }],
            });
        }

        if (trailing) {
            nodes.push({ type: "text", value: trailing });
        }

        cursor = index + matchedPath.length;
    }

    if (cursor < value.length) {
        nodes.push({ type: "text", value: value.slice(cursor) });
    }

    return nodes;
}

function transformWorkspaceLinks(node: MarkdownNode) {
    if (!node.children || node.children.length === 0) return;
    if (
        node.type === "link" ||
        node.type === "linkReference" ||
        node.type === "definition"
    )
        return;

    const nextChildren: MarkdownNode[] = [];
    for (const child of node.children) {
        if (child.type === "inlineCode" && child.value) {
            const { path, trailing } = splitWorkspacePathSuffix(child.value);
            if (path && !trailing && isWorkspacePath(path)) {
                nextChildren.push({
                    type: "link",
                    url: workspaceLinkHref(path),
                    title: null,
                    children: [{ type: "text", value: path }],
                });
                continue;
            }
        }

        if (child.type === "text" && child.value) {
            nextChildren.push(...splitTextIntoWorkspaceLinkNodes(child.value));
            continue;
        }

        if (
            child.children &&
            child.type !== "code" &&
            child.type !== "inlineCode" &&
            child.type !== "html"
        ) {
            transformWorkspaceLinks(child);
        }

        nextChildren.push(child);
    }

    node.children = nextChildren;
}

function remarkWorkspaceLinks() {
    return (tree: MarkdownNode) => {
        transformWorkspaceLinks(tree);
    };
}

function DeliverablesPanel({
    deliverables,
    onArtifactClick,
}: {
    deliverables?: ProjectTaskDeliverable[];
    onArtifactClick: (path: string) => void;
}) {
    const entries = React.useMemo(() => {
        if (!deliverables || deliverables.length === 0) return [];
        return [...deliverables].sort(
            (a, b) => timestampValue(b.at) - timestampValue(a.at),
        );
    }, [deliverables]);

    if (entries.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-muted-foreground">
                No deliverables recorded yet. They appear here once a task
                completion is marked.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
            <div className="mx-auto max-w-3xl space-y-4">
                {entries.map((entry, idx) => (
                    <div
                        key={`${entry.assignment_id}-${idx}`}
                        className="rounded-[10px] border border-border bg-card p-4"
                    >
                        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-sm font-normal text-foreground">
                                {entry.by_agent_name || "agent"}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                                {formatTime(entry.at)}
                            </span>
                            <span className="text-xs text-muted-foreground/50">
                                · assignment #{entry.assignment_id}
                            </span>
                        </div>
                        {entry.result_summary ? (
                            <p className="mb-3 text-sm leading-relaxed text-foreground/90">
                                {entry.result_summary}
                            </p>
                        ) : null}
                        {entry.artifacts && entry.artifacts.length > 0 ? (
                            <div className="mb-3">
                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                    Artifacts
                                </div>
                                <ul className="space-y-1">
                                    {entry.artifacts.map((path) => (
                                        <li key={path}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onArtifactClick(path)
                                                }
                                                className="text-left text-sm text-foreground/90 underline-offset-2 hover:underline"
                                            >
                                                {path}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {entry.findings ? (
                            <div className="mb-2 text-sm">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                    Findings:
                                </span>{" "}
                                <span className="text-foreground/90">
                                    {entry.findings}
                                </span>
                            </div>
                        ) : null}
                        {entry.cautions ? (
                            <div className="mb-2 text-sm">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                    Cautions:
                                </span>{" "}
                                <span className="text-foreground/90">
                                    {entry.cautions}
                                </span>
                            </div>
                        ) : null}
                        {entry.next ? (
                            <div className="text-sm">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                    Next:
                                </span>{" "}
                                <span className="text-foreground/90">
                                    {entry.next}
                                </span>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ProjectTaskDetailPage() {
    const params = useParams<{ projectId: string; taskId: string }>();
    const projectId = params?.projectId;
    const taskId = params?.taskId;
    const { hasSession } = useActiveAgent();
    const { projects, loading: projectsLoading } = useActorProjects({
        enabled: hasSession,
    });
    const project =
        projects.find((item: ActorProject) => item.id === projectId) || null;
    const {
        item,
        assignments,
        assignmentsHasMore,
        assignmentsLoadingMore,
        loading,
        error,
        archiveItem,
        unarchiveItem,
        cancelItem,
        submitAnswer,
        submitApproval,
        updateItem,
        loadMoreAssignments,
        taskWorkspace,
        taskWorkspaceLoading,
        taskWorkspaceError,
        getTaskWorkspaceFile,
        downloadTaskWorkspaceFile,
        listTaskWorkspaceDirectory,
        refetchTaskWorkspace,
    } = useProjectTaskBoardItem(projectId, taskId, !!taskId, {
        includeArchived: true,
    });

    const workspaceEntries = React.useMemo<ProjectTaskWorkspaceFileEntry[]>(
        () => taskWorkspace?.files || [],
        [taskWorkspace],
    );
    const getWorkspaceFile = React.useCallback(
        async (path: string) => (await getTaskWorkspaceFile(path)).data,
        [getTaskWorkspaceFile],
    );
    const listWorkspaceDirectory = React.useCallback(
        async (path?: string) => (await listTaskWorkspaceDirectory(path)).data,
        [listTaskWorkspaceDirectory],
    );
    const orderedAssignments = React.useMemo<ProjectTaskBoardItemAssignment[]>(
        () =>
            [...assignments].sort(
                (
                    a: ProjectTaskBoardItemAssignment,
                    b: ProjectTaskBoardItemAssignment,
                ) =>
                    timestampValue(a.created_at) -
                        timestampValue(b.created_at) ||
                    a.id.localeCompare(b.id),
            ),
        [assignments],
    );

    const [activeTab, setActiveTab] =
        React.useState<TaskSurfaceTab>("assignments");
    const [selection, setSelection] = React.useState<TaskPaneSelection | null>(
        null,
    );
    const [requestedWorkspacePath, setRequestedWorkspacePath] = React.useState<
        string | null
    >(null);
    const descriptionRef = React.useRef<HTMLDivElement>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] =
        React.useState(false);
    const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
        React.useState(false);

    React.useLayoutEffect(() => {
        const el = descriptionRef.current;
        if (!el) {
            setIsDescriptionOverflowing(false);
            return;
        }
        setIsDescriptionOverflowing(el.scrollHeight > 240);
    }, [item?.description]);

    const selectedAssignment =
        selection?.kind === "assignment"
            ? assignments.find(
                  (assignment: ProjectTaskBoardItemAssignment) =>
                      assignment.id === selection.assignmentId,
              ) || null
            : null;

    const snapshot = React.useMemo(() => {
        const runCount = assignments.length;
        const runningCount = assignments.filter(
            (a: ProjectTaskBoardItemAssignment) =>
                a.status === "in_progress" || a.status === "claimed",
        ).length;
        const deliverableCount = item?.deliverables?.length ?? 0;
        const latestDeliverable = item?.deliverables
            ? [...item.deliverables].sort(
                  (a, b) => timestampValue(b.at) - timestampValue(a.at),
              )[0]
            : undefined;
        const lastActivityTs = Math.max(
            timestampValue(item?.updated_at),
            ...assignments.map((a: ProjectTaskBoardItemAssignment) =>
                timestampValue(a.updated_at),
            ),
        );
        const lastActivity = lastActivityTs
            ? new Date(lastActivityTs).toISOString()
            : undefined;
        return {
            runCount,
            runningCount,
            deliverableCount,
            latestDeliverableSummary: latestDeliverable?.result_summary,
            lastActivity,
        };
    }, [assignments, item]);

    const openWorkspacePath = React.useCallback((path: string | null) => {
        const normalizedPath = normalizeWorkspacePath(path);
        if (!normalizedPath) return;
        setActiveTab("files");
        setRequestedWorkspacePath(normalizedPath);
    }, []);

    const handleWorkspaceLinkClickCapture = React.useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) return;
            const workspaceHref = resolveWorkspaceHref(
                anchor.getAttribute("href"),
            );
            if (!workspaceHref) return;
            event.preventDefault();
            event.stopPropagation();
            openWorkspacePath(workspaceHref);
        },
        [openWorkspacePath],
    );

    const markdownComponents = React.useMemo(
        () => ({
            a: (
                props: React.ComponentPropsWithoutRef<"a"> & { node?: unknown },
            ) => {
                const { href, children, ...rest } = props;
                const workspaceHref = resolveWorkspaceHref(href);
                if (workspaceHref) {
                    return (
                        <button
                            type="button"
                            className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40"
                            onClick={() => openWorkspacePath(workspaceHref)}
                        >
                            {children}
                        </button>
                    );
                }
                return (
                    <a
                        {...rest}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40"
                    >
                        {children}
                    </a>
                );
            },
        }),
        [openWorkspacePath],
    );

    React.useEffect(() => {
        if (
            activeTab === "assignments" &&
            selection?.kind !== "assignment" &&
            orderedAssignments.length > 0
        ) {
            setSelection({
                kind: "assignment",
                assignmentId: orderedAssignments[0].id,
            });
        }
    }, [activeTab, selection, orderedAssignments]);

    if (!hasSession)
        return (
            <PageState
                title="No session"
                description="Open via a valid agent session link."
            />
        );

    if (projectsLoading || loading)
        return (
            <div className="h-full flex flex-col space-y-4 bg-background p-8">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-40 rounded" />
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <Skeleton className="rounded" />
                    <Skeleton className="rounded" />
                </div>
            </div>
        );

    if (error || !item)
        return (
            <PageState
                title="Task not found"
                description="The requested task could not be loaded."
            />
        );

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
            <AgentNavbar
                left={
                    <div className="flex items-center gap-2">
                        <IconChecklist
                            size={13}
                            stroke={2}
                            className="text-muted-foreground"
                        />
                        <span className="text-sm font-normal">
                            {project?.name || "Tasks"}
                        </span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-normal">
                            {item.task_key || `TSK-${item.id.substring(0, 4)}`}
                        </span>
                    </div>
                }
                right={
                    <>
                        <span
                            className={cn(
                                "inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2 font-mono text-[11px] font-medium lowercase text-foreground-secondary",
                                PILL_KIND_CLASS[
                                    STATUS_PILL_KIND[item.status || ""] ||
                                        "info"
                                ],
                            )}
                        >
                            <span
                                className={cn(
                                    "size-[6px] rounded-full",
                                    PILL_DOT_CLASS[
                                        STATUS_PILL_KIND[item.status || ""] ||
                                            "info"
                                    ],
                                )}
                            />
                            {item.status?.replace(/_/g, " ")}
                        </span>
                        <EditTaskDialog
                            task={item}
                            onUpdate={async (request, files) => {
                                await updateItem(request, files);
                            }}
                        />
                        {item.status !== "cancelled" &&
                        item.status !== "completed" ? (
                            <button
                                onClick={async () => {
                                    if (
                                        !window.confirm(
                                            "Cancel this task? Any in-flight executor will be preempted.",
                                        )
                                    )
                                        return;
                                    await cancelItem();
                                }}
                                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-accent/50"
                            >
                                <span>Cancel</span>
                            </button>
                        ) : null}
                        <button
                            onClick={async () =>
                                item.archived_at
                                    ? await unarchiveItem()
                                    : await archiveItem()
                            }
                            className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-accent/50"
                        >
                            <IconArchive size={13} stroke={1.5} />
                            <span>
                                {item.archived_at ? "Unarchive" : "Archive"}
                            </span>
                        </button>
                    </>
                }
            />

            <div className="flex-1 overflow-y-auto">
                <div className="flex h-full w-full flex-col">
                    {/* Task Title Section */}
                    <div className="border-b border-border px-4 py-4 md:px-5">
                        <div className="max-w-4xl space-y-3">
                            <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                                {project?.name || "Tasks"} ·{" "}
                                {item.task_key ||
                                    `TSK-${item.id.substring(0, 4)}`}
                            </div>
                            <h1 className="text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                                {item.title}
                            </h1>
                            {/* Task snapshot */}
                            <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                                <div className="border-b border-border px-[18px] py-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                    Task snapshot
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
                                    <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
                                        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                            status
                                        </div>
                                        <div
                                            className={cn(
                                                "text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground",
                                                statusHueClass(item.status),
                                            )}
                                        >
                                            {item.status?.replace(/_/g, " ") ||
                                                "—"}
                                        </div>
                                        <div className="font-mono text-[11px] leading-[1.4] text-faint">
                                            {item.completed_at
                                                ? "completed"
                                                : item.scheduled_for
                                                  ? "scheduled"
                                                  : "active"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
                                        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                            agent runs
                                        </div>
                                        <div className="text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground">
                                            {snapshot.runCount}
                                        </div>
                                        <div className="font-mono text-[11px] leading-[1.4] text-faint">
                                            {snapshot.runningCount > 0
                                                ? `${snapshot.runningCount} running`
                                                : "—"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
                                        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                            deliverables
                                        </div>
                                        <div className="text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground">
                                            {snapshot.deliverableCount}
                                        </div>
                                        <div className="truncate font-mono text-[11px] leading-[1.4] text-faint">
                                            {snapshot.latestDeliverableSummary ||
                                                "—"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
                                        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                            last activity
                                        </div>
                                        <div className="text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground">
                                            {formatTime(snapshot.lastActivity) ||
                                                "—"}
                                        </div>
                                        <div className="font-mono text-[11px] leading-[1.4] text-faint">
                                            {snapshot.lastActivity
                                                ? new Date(
                                                      snapshot.lastActivity,
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {item.description ? (
                                <div className="relative">
                                    <div
                                        ref={descriptionRef}
                                        className={cn(
                                            DOCUMENT_PROSE_CLASSNAME,
                                            isDescriptionExpanded
                                                ? "max-h-[420px] overflow-y-auto pr-2"
                                                : "max-h-[240px] overflow-hidden",
                                        )}
                                        onClickCapture={
                                            handleWorkspaceLinkClickCapture
                                        }
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[
                                                remarkGfm,
                                                remarkWorkspaceLinks,
                                            ]}
                                            components={markdownComponents}
                                        >
                                            {item.description}
                                        </ReactMarkdown>
                                    </div>
                                    {isDescriptionOverflowing &&
                                    !isDescriptionExpanded ? (
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                                    ) : null}
                                    {isDescriptionOverflowing ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsDescriptionExpanded(
                                                    (v) => !v,
                                                )
                                            }
                                            className="mt-2 flex items-center gap-1.5 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {isDescriptionExpanded ? (
                                                <IconChevronUp
                                                    size={13}
                                                    stroke={1.5}
                                                />
                                            ) : (
                                                <IconChevronDown
                                                    size={13}
                                                    stroke={1.5}
                                                />
                                            )}
                                            <span>
                                                {isDescriptionExpanded
                                                    ? "Show less"
                                                    : "Show more"}
                                            </span>
                                        </button>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="text-sm italic text-muted-foreground">
                                    No description provided.
                                </p>
                            )}
                            {item.pending_question ? (
                                <PendingQuestionCard
                                    pending={item.pending_question}
                                    onSubmit={async (submission) => {
                                        await submitAnswer(submission);
                                    }}
                                />
                            ) : null}
                            {item.pending_approval ? (
                                <TaskApprovalCard
                                    pending={item.pending_approval}
                                    onSubmit={async (approvals) =>
                                        submitApproval(approvals)
                                    }
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* Agentic Workspace */}
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
                            <div className="inline-flex gap-0.5 rounded-[8px] border border-border bg-secondary p-[3px]">
                                {(
                                    [
                                        "assignments",
                                        "deliverables",
                                        "files",
                                        "comments",
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "h-7 rounded-[6px] px-[13px] text-[12px] font-medium capitalize text-muted-foreground transition-all",
                                            activeTab === tab
                                                ? "bg-card text-foreground shadow-[0_0_0_0.5px_var(--wa-border-strong)]"
                                                : "hover:text-foreground",
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeTab === "files" ? (
                            <TaskWorkspaceExplorer
                                rootEntries={workspaceEntries}
                                rootLoading={taskWorkspaceLoading}
                                rootError={
                                    taskWorkspaceError
                                        ? String(taskWorkspaceError)
                                        : null
                                }
                                getFile={getWorkspaceFile}
                                listDirectory={listWorkspaceDirectory}
                                refetchRoot={refetchTaskWorkspace}
                                requestedPath={requestedWorkspacePath}
                                downloadFile={downloadTaskWorkspaceFile}
                            />
                        ) : activeTab === "comments" ? (
                            <TaskCommentsPanel
                                projectId={projectId}
                                taskId={taskId}
                            />
                        ) : activeTab === "deliverables" ? (
                            <DeliverablesPanel
                                deliverables={item.deliverables}
                                onArtifactClick={(path) => {
                                    setRequestedWorkspacePath(path);
                                    setActiveTab("files");
                                }}
                            />
                        ) : (
                            <div className="flex min-h-0 flex-1">
                                <div className="flex w-75 flex-col border-r border-border">
                                    <div className="flex-1 overflow-y-auto py-3 scrollbar-hide">
                                        <div className="px-4 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                            Agent assignments
                                        </div>
                                        <div>
                                            {orderedAssignments.map(
                                                (assignment) => {
                                                    const isActive =
                                                        selection?.kind ===
                                                            "assignment" &&
                                                        selection.assignmentId ===
                                                            assignment.id;
                                                    const latestActivity =
                                                        assignment.result_summary ||
                                                        formatAssignmentStatus(
                                                            assignment,
                                                        );
                                                    const startedAt =
                                                        assignment.started_at ||
                                                        assignment.claimed_at ||
                                                        assignment.created_at;
                                                    const duration =
                                                        formatDuration(
                                                            assignment.started_at ||
                                                                assignment.claimed_at,
                                                            assignment.completed_at ||
                                                                assignment.rejected_at,
                                                        );
                                                    return (
                                                        <button
                                                            key={assignment.id}
                                                            onClick={() =>
                                                                setSelection({
                                                                    kind: "assignment",
                                                                    assignmentId:
                                                                        assignment.id,
                                                                })
                                                            }
                                                            className={cn(
                                                                "grid w-full grid-cols-[7px_1fr_20px] items-center gap-[14px] border-b border-border px-4 py-[13px] text-left last:border-b-0 hover:bg-secondary",
                                                                isActive &&
                                                                    "bg-secondary",
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "size-[7px] rounded-full",
                                                                    dotColorClass(
                                                                        assignment.status,
                                                                    ),
                                                                )}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="truncate text-[13px] font-medium leading-[1.2] text-foreground">
                                                                        {formatLabel(
                                                                            assignment.assignment_role,
                                                                        )}
                                                                    </span>
                                                                    <span className="inline-flex w-fit flex-none items-center rounded-[3px] border border-border bg-secondary px-1.5 py-px font-mono text-[11px] font-medium text-foreground-secondary">
                                                                        {formatLabel(
                                                                            assignment.status,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 truncate text-[12px] text-muted-foreground">
                                                                    {latestActivity}
                                                                </div>
                                                                <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-faint">
                                                                    <span>
                                                                        {formatTime(
                                                                            startedAt,
                                                                        ) ||
                                                                            "—"}
                                                                    </span>
                                                                    <span>
                                                                        ·
                                                                    </span>
                                                                    <span className="tabular-nums">
                                                                        {
                                                                            duration
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <IconChevronRight
                                                                size={14}
                                                                className="justify-self-end text-faint"
                                                            />
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                        {assignmentsHasMore ? (
                                            <div className="px-4 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void loadMoreAssignments()
                                                    }
                                                    disabled={
                                                        assignmentsLoadingMore
                                                    }
                                                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {assignmentsLoadingMore
                                                        ? "Loading..."
                                                        : "Load more assignments"}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col bg-background">
                                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-5">
                                        <div className="max-w-md truncate text-sm font-normal text-muted-foreground">
                                            {selection?.kind === "assignment"
                                                ? formatLabel(
                                                      selectedAssignment?.assignment_role,
                                                  )
                                                : ""}
                                        </div>
                                    </div>

                                    <div
                                        className="flex-1 overflow-y-auto px-4 py-4 md:px-5"
                                        onClickCapture={
                                            handleWorkspaceLinkClickCapture
                                        }
                                    >
                                        {selection?.kind === "assignment" &&
                                        selectedAssignment ? (
                                            <div className="max-w-2xl space-y-6">
                                                <div className="space-y-2">
                                                    <h2 className="text-base font-normal">
                                                        {formatLabel(
                                                            selectedAssignment.assignment_role,
                                                        )}
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                        <span>
                                                            {formatAssignmentStatus(
                                                                selectedAssignment,
                                                            )}
                                                        </span>
                                                        <span>·</span>
                                                        <span>
                                                            {new Date(
                                                                selectedAssignment.updated_at,
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {selectedAssignment.instructions ? (
                                                    <div
                                                        className={
                                                            DOCUMENT_PROSE_CLASSNAME
                                                        }
                                                    >
                                                        <ReactMarkdown
                                                            remarkPlugins={[
                                                                remarkGfm,
                                                                remarkWorkspaceLinks,
                                                            ]}
                                                            components={
                                                                markdownComponents
                                                            }
                                                        >
                                                            {
                                                                selectedAssignment.instructions
                                                            }
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm italic text-muted-foreground">
                                                        No instructions
                                                        recorded.
                                                    </p>
                                                )}

                                                <div className="grid gap-3 text-sm text-muted-foreground">
                                                    {selectedAssignment.result_summary ? (
                                                        <div>
                                                            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                                                Result
                                                            </div>
                                                            <div
                                                                className={
                                                                    DOCUMENT_PROSE_CLASSNAME
                                                                }
                                                            >
                                                                <ReactMarkdown
                                                                    remarkPlugins={[
                                                                        remarkGfm,
                                                                        remarkWorkspaceLinks,
                                                                    ]}
                                                                    components={
                                                                        markdownComponents
                                                                    }
                                                                >
                                                                    {
                                                                        selectedAssignment.result_summary
                                                                    }
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    {selectedAssignment.handoff_file_path ? (
                                                        <div>
                                                            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                                                Handoff File
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openWorkspacePath(
                                                                        selectedAssignment.handoff_file_path ??
                                                                            null,
                                                                    )
                                                                }
                                                                className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40"
                                                            >
                                                                {
                                                                    selectedAssignment.handoff_file_path
                                                                }
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    <div>
                                                        <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                                            Thread
                                                        </div>
                                                        <div>
                                                            {
                                                                selectedAssignment.thread_id
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
