"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useActorProjects, useProjectTaskBoardItem } from "@wacht/nextjs";
import type {
    ActorProject,
    ProjectTaskBoardItemAssignment,
    ProjectTaskWorkspaceFileEntry,
} from "@wacht/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    IconArchive,
    IconChecklist,
    IconRoute,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { EditTaskDialog } from "@/components/agent/task-board-dialogs";
import { TaskWorkspaceExplorer } from "@/components/agent/task-workspace-explorer";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";

type TaskPaneSelection =
    | { kind: "assignment"; assignmentId: string };

type TaskSurfaceTab = "assignments" | "files";

const WORKSPACE_PATH_PATTERN = /\/(?:task|workspace)\/[A-Za-z0-9._/-]+/g;
const WORKSPACE_PATH_CHECK_PATTERN = /^\/(?:task|workspace)\/[A-Za-z0-9._/-]+$/;
const WORKSPACE_TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]]+$/;

const DOCUMENT_PROSE_CLASSNAME =
    "prose prose-sm prose-invert max-w-none text-sm leading-6 text-muted-foreground font-normal " +
    "prose-p:text-muted-foreground prose-li:text-muted-foreground prose-ul:my-1 prose-li:my-0 " +
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
    }).format(new Date(value)).toLowerCase();
}

function timestampValue(value?: string) {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getStatusIndicator(status?: string) {
    const colors: Record<string, string> = {
        completed: "bg-emerald-500",
        failed: "bg-rose-500",
        blocked: "bg-rose-500",
        rejected: "bg-rose-500",
        running: "bg-blue-500 animate-pulse",
        in_progress: "bg-blue-500",
        available: "bg-amber-500",
    };
    return <div className={cn("size-1.5 rounded-full shrink-0", colors[status || ""] || "bg-muted-foreground/40")} />;
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

function normalizeWorkspacePath(value: unknown) {
    if (typeof value !== "string") return null;
    if (value.startsWith("/task/")) return value.slice("/task/".length);
    if (value.startsWith("/workspace/")) return value.slice(1);
    return value;
}

function isWorkspacePath(value: unknown): value is string {
    return typeof value === "string" && WORKSPACE_PATH_CHECK_PATTERN.test(value);
}

function splitWorkspacePathSuffix(value: string) {
    const trimmedPath = value.replace(WORKSPACE_TRAILING_PUNCTUATION_PATTERN, "");
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
    if (node.type === "link" || node.type === "linkReference" || node.type === "definition") return;

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

export default function ProjectTaskDetailPage() {
    const params = useParams<{ projectId: string; taskId: string }>();
    const projectId = params?.projectId;
    const taskId = params?.taskId;
    const { hasSession } = useActiveAgent();
    const {
        projects,
        loading: projectsLoading,
    } = useActorProjects({
        enabled: hasSession,
    });
    const project = projects.find((item: ActorProject) => item.id === projectId) || null;
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
        updateItem,
        loadMoreAssignments,
        taskWorkspace,
        taskWorkspaceLoading,
        taskWorkspaceError,
        getTaskWorkspaceFile,
        listTaskWorkspaceDirectory,
        refetchTaskWorkspace,
    } = useProjectTaskBoardItem(projectId, taskId, !!taskId, { includeArchived: true });

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
                (a: ProjectTaskBoardItemAssignment, b: ProjectTaskBoardItemAssignment) =>
                    timestampValue(a.created_at) - timestampValue(b.created_at) ||
                    a.id.localeCompare(b.id),
            ),
        [assignments],
    );

    const [activeTab, setActiveTab] = React.useState<TaskSurfaceTab>("assignments");
    const [selection, setSelection] = React.useState<TaskPaneSelection | null>(null);
    const [requestedWorkspacePath, setRequestedWorkspacePath] = React.useState<string | null>(null);

    const selectedAssignment =
        selection?.kind === "assignment"
            ? assignments.find(
                  (assignment: ProjectTaskBoardItemAssignment) =>
                      assignment.id === selection.assignmentId,
              ) || null
            : null;

    const openWorkspacePath = React.useCallback((path: string | null) => {
        const normalizedPath = normalizeWorkspacePath(path);
        if (!normalizedPath) return;
        setActiveTab("files");
        setRequestedWorkspacePath(normalizedPath);
    }, []);

    const handleWorkspaceLinkClickCapture = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const workspaceHref = resolveWorkspaceHref(anchor.getAttribute("href"));
        if (!workspaceHref) return;
        event.preventDefault();
        event.stopPropagation();
        openWorkspacePath(workspaceHref);
    }, [openWorkspacePath]);

    const markdownComponents = React.useMemo(() => ({
        a: (props: React.ComponentPropsWithoutRef<"a"> & { node?: unknown }) => {
            const { href, children, ...rest } = props;
            const workspaceHref = resolveWorkspaceHref(href);
            if (workspaceHref) {
                return (
                    <button type="button" className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40" onClick={() => openWorkspacePath(workspaceHref)}>
                        {children}
                    </button>
                );
            }
            return <a {...rest} href={href} target="_blank" rel="noreferrer" className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40">{children}</a>;
        },
    }), [openWorkspacePath]);

    React.useEffect(() => {
        if (activeTab === "assignments" &&
            selection?.kind !== "assignment" &&
            orderedAssignments.length > 0) {
            setSelection({
                kind: "assignment",
                assignmentId: orderedAssignments[0].id,
            });
        }
    }, [activeTab, selection, orderedAssignments]);

    if (!hasSession) return <PageState title="No session" description="Open via a valid agent session link." />;

    if (projectsLoading || loading) return (
        <div className="h-full flex flex-col space-y-4 bg-background p-8">
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-40 rounded" />
            <div className="grid grid-cols-2 gap-4 flex-1">
                <Skeleton className="rounded" />
                <Skeleton className="rounded" />
            </div>
        </div>
    );

    if (error || !item) return <PageState title="Task not found" description="The requested task could not be loaded." />;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
            <AgentNavbar
                left={(
                    <div className="flex items-center gap-2">
                        <IconChecklist size={13} stroke={2} className="text-muted-foreground" />
                        <span className="text-sm font-normal">{project?.name || "Tasks"}</span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-normal">
                            {item.task_key || `TSK-${item.id.substring(0, 4)}`}
                        </span>
                    </div>
                )}

                right={(
                    <>
                    <div className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1">
                        {getStatusIndicator(item.status)}
                        <span className="text-sm text-muted-foreground">{item.status?.replace(/_/g, " ")}</span>
                    </div>
                    <EditTaskDialog
                        task={item}
                        onUpdate={async (request, files) => {
                            await updateItem(request, files);
                        }}
                    />
                    {item.status !== "cancelled" && item.status !== "completed" ? (
                        <button
                            onClick={async () => {
                                if (
                                    !window.confirm(
                                        "Cancel this task? Any in-flight executor will be preempted.",
                                    )
                                ) return;
                                await cancelItem();
                            }}
                            className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 px-3 text-sm transition-colors hover:bg-accent/50"
                        >
                            <span>Cancel</span>
                        </button>
                    ) : null}
                    <button
                        onClick={async () => item.archived_at ? await unarchiveItem() : await archiveItem()}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 px-3 text-sm transition-colors hover:bg-accent/50"
                    >
                        <IconArchive size={13} stroke={1.5} />
                        <span>{item.archived_at ? "Unarchive" : "Archive"}</span>
                    </button>
                    </>
                )}
            />

            <div className="flex-1 overflow-y-auto">
                <div className="flex h-full w-full flex-col">
                    {/* Task Title Section */}
                    <div className="border-b border-border/50 px-4 py-4 md:px-5">
                        <div className="max-w-4xl space-y-3">
                            <h1 className="text-base font-normal leading-tight">{item.title}</h1>
                            {item.description ? (
                                <div className={DOCUMENT_PROSE_CLASSNAME} onClickCapture={handleWorkspaceLinkClickCapture}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkWorkspaceLinks]} components={markdownComponents}>
                                        {item.description}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-sm italic text-muted-foreground">No description provided.</p>
                            )}
                        </div>
                    </div>

                    {/* Agentic Workspace */}
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4">
                            <div className="flex rounded-md border border-border/50 p-0.5">
                                {(["assignments", "files"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "rounded px-3 py-1 text-sm font-normal capitalize transition-all",
                                            activeTab === tab ? "border border-border bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
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
                                rootError={taskWorkspaceError ? String(taskWorkspaceError) : null}
                                getFile={getWorkspaceFile}
                                listDirectory={listWorkspaceDirectory}
                                refetchRoot={refetchTaskWorkspace}
                                requestedPath={requestedWorkspacePath}
                            />
                        ) : (
                            <div className="flex min-h-0 flex-1">
                                <div className="flex w-[300px] flex-col border-r border-border/50">
                                    <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
                                        <div className="space-y-px">
                                            {orderedAssignments.map((assignment) => (
                                                <button
                                                    key={assignment.id}
                                                    onClick={() =>
                                                        setSelection({
                                                            kind: "assignment",
                                                            assignmentId: assignment.id,
                                                        })
                                                    }
                                                    className={cn(
                                                        "group flex w-full items-center gap-3 rounded px-3 py-1.5 text-left transition-all",
                                                        selection?.kind === "assignment" &&
                                                            selection.assignmentId === assignment.id
                                                            ? "bg-accent/40"
                                                            : "hover:bg-accent/20",
                                                    )}
                                                >
                                                    <IconRoute
                                                        size={14}
                                                        className={cn(
                                                            "shrink-0",
                                                            selection?.kind === "assignment" &&
                                                                selection.assignmentId === assignment.id
                                                                ? "text-foreground"
                                                                : "text-muted-foreground/60",
                                                        )}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-normal">
                                                            {formatLabel(assignment.assignment_role)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground/60">
                                                            {formatAssignmentStatus(assignment)}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        {assignmentsHasMore ? (
                                            <div className="px-3 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void loadMoreAssignments()}
                                                    disabled={assignmentsLoadingMore}
                                                    className="w-full rounded-md border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
                                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 md:px-5">
                                        <div className="max-w-md truncate text-sm font-normal text-muted-foreground">
                                            {selection?.kind === "assignment"
                                                ? formatLabel(selectedAssignment?.assignment_role)
                                                : ""}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5" onClickCapture={handleWorkspaceLinkClickCapture}>
                                        {selection?.kind === "assignment" && selectedAssignment ? (
                                            <div className="max-w-2xl space-y-6">
                                                <div className="space-y-2">
                                                    <h2 className="text-base font-normal">
                                                        {formatLabel(selectedAssignment.assignment_role)}
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{formatAssignmentStatus(selectedAssignment)}</span>
                                                        <span>·</span>
                                                        <span>{new Date(selectedAssignment.updated_at).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {selectedAssignment.instructions ? (
                                                    <div className={DOCUMENT_PROSE_CLASSNAME}>
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkWorkspaceLinks]}
                                                            components={markdownComponents}
                                                        >
                                                            {selectedAssignment.instructions}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm italic text-muted-foreground">
                                                        No instructions recorded.
                                                    </p>
                                                )}

                                                <div className="grid gap-3 text-sm text-muted-foreground">
                                                    {selectedAssignment.result_summary ? (
                                                        <div>
                                                            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                                                Result
                                                            </div>
                                                            <div className="text-foreground/90">
                                                                {selectedAssignment.result_summary}
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
                                                                        selectedAssignment.handoff_file_path ?? null,
                                                                    )
                                                                }
                                                                className="text-foreground underline decoration-divider underline-offset-4 hover:decoration-foreground/40"
                                                            >
                                                                {selectedAssignment.handoff_file_path}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    <div>
                                                        <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/70">
                                                            Thread
                                                        </div>
                                                        <div>{selectedAssignment.thread_id}</div>
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
