"use client";

import * as React from "react";
import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@xyflow/react/dist/style.css";
import {
    IconArchive,
    IconRefresh,
    IconBinaryTree,
    IconMessageCircle,
    IconClock,
    IconRoute,
    IconChevronRight,
} from "@tabler/icons-react";
import {
    useActorProjects,
    useAgentThread,
    useAgentThreadAssignments,
    useAgentThreadTaskGraphs,
} from "@wacht/nextjs";
import type {
    ActorProject,
    ProjectTaskBoardItemAssignment,
    ThreadTaskGraphBundle,
} from "@wacht/types";
import { EditThreadDialog } from "@/components/agent/thread-editor-dialog";
import { ThreadPendingActionPanel } from "@/components/agent/thread-pending-action-panel";
import { ThreadTaskGraphDrawer } from "@/components/agent/thread-task-graph-drawer";
import { useActiveAgent } from "@/components/agent-provider";
import { JsonViewer } from "@/components/json-viewer";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { PageState } from "@/components/ui/page-state";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DOCUMENT_PROSE_CLASSNAME =
    "prose prose-sm prose-invert max-w-none text-sm leading-6 text-muted-foreground font-normal " +
    "prose-p:text-muted-foreground prose-li:text-muted-foreground prose-ul:my-1 prose-li:my-0 " +
    "prose-strong:text-foreground prose-a:text-foreground prose-code:text-foreground prose-code:bg-accent/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-normal " +
    "prose-pre:bg-accent/20 prose-pre:border prose-pre:border-border prose-pre:rounded-md " +
    "[&_h1]:text-base [&_h1]:font-medium [&_h1]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3 " +
    "[&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:mt-5 [&_h2]:mb-2 " +
    "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-muted-foreground [&_h3]:mt-4 [&_h3]:mb-1";

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

function formatRelativeDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

function formatFullTimestamp(value?: string) {
    if (!value) return "No timestamp";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getStatusIndicator(status?: string) {
    const colors: Record<string, string> = {
        completed: "bg-success",
        failed: "bg-error",
        blocked: "bg-error",
        rejected: "bg-error",
        running: "bg-warning animate-pulse",
        in_progress: "bg-warning",
        available: "bg-warning",
    };
    return (
        <div
            className={cn(
                "size-1.5 rounded-full shrink-0",
                colors[status || ""] || "bg-muted-foreground/40",
            )}
        />
    );
}

function statusHueClass(status?: string) {
    const s = status || "";
    if (["completed"].includes(s)) return "text-success";
    if (["failed", "blocked", "rejected"].includes(s)) return "text-error";
    if (["running", "in_progress", "available", "waiting_for_input"].includes(s))
        return "text-warning";
    return "text-foreground";
}

function StatusPill({ status }: { status?: string }) {
    const s = status || "active";
    const tone =
        s === "completed"
            ? "border-success/30 bg-success-soft text-success"
            : ["failed", "blocked", "rejected"].includes(s)
              ? "border-error/30 bg-error-soft text-error"
              : ["running", "in_progress", "available", "waiting_for_input", "interrupted"].includes(s)
                ? "border-warning/30 bg-warning-soft text-warning"
                : "border-border bg-secondary text-foreground-secondary";
    return (
        <span
            className={cn(
                "inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
                tone,
            )}
        >
            {getStatusIndicator(status)}
            {s.replace(/_/g, " ")}
        </span>
    );
}

function ThreadSnapCell({
    k,
    v,
    vClass,
}: {
    k: string;
    v: React.ReactNode;
    vClass?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {k}
            </div>
            <div
                className={cn(
                    "truncate text-[20px] font-medium capitalize leading-[1.1] tracking-[-0.012em] text-foreground",
                    vClass,
                )}
            >
                {v}
            </div>
        </div>
    );
}

function formatAssignmentStatus(assignment: ProjectTaskBoardItemAssignment) {
    if (assignment.result_status) {
        return `${formatLabel(assignment.status)} · ${formatLabel(assignment.result_status)}`;
    }
    return formatLabel(assignment.status);
}

export default function ThreadDetailPage() {
    const params = useParams<{ threadId: string }>();
    const threadId = params?.threadId;
    const { hasSession, agents } = useActiveAgent();
    const {
        thread,
        loading,
        error,
        updateThread,
        archiveThread,
        unarchiveThread,
        refetch: refetchThread,
    } = useAgentThread(threadId, !!threadId);
    const { projects } = useActorProjects({
        enabled: hasSession,
    });
    const project = useMemo(
        () =>
            projects.find(
                (item: ActorProject) => item.id === thread?.project_id,
            ) || null,
        [projects, thread?.project_id],
    );
    const agentNamesById = useMemo(
        () => new Map(agents.map((agent) => [agent.id, agent.name])),
        [agents],
    );
    const showAssignments =
        !!thread && !!project && project.coordinator_thread_id !== thread.id;
    const {
        assignments,
        loading: assignmentsLoading,
        hasMore: assignmentsHasMore,
        loadingMore: assignmentsLoadingMore,
        loadMore: loadMoreAssignments,
        refetch: refetchAssignments,
    } = useAgentThreadAssignments(threadId, {
        enabled: !!threadId && showAssignments,
    });
    const {
        graphs: allGraphs,
        loadMore: loadMoreGraphs,
        has_more: hasMoreGraphs,
        loadingMore: loadingMoreGraphs,
        latestGraph,
    } = useAgentThreadTaskGraphs(threadId, !!threadId);

    const orderedAssignments = useMemo(
        () =>
            [...assignments].sort(
                (a, b) =>
                    timestampValue(a.created_at) - timestampValue(b.created_at) ||
                    a.id.localeCompare(b.id),
            ),
        [assignments],
    );
    const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<
        string | null
    >(null);
    const [showTaskGraph, setShowTaskGraph] = React.useState(false);
    const [activeGraphId, setActiveGraphId] = React.useState<string | null>(
        null,
    );

    React.useEffect(() => {
        if (!allGraphs.length) {
            setActiveGraphId(null);
            return;
        }
        if (
            !activeGraphId ||
            !allGraphs.some(
                (bundle: ThreadTaskGraphBundle) =>
                    bundle.graph.id === activeGraphId,
            )
        )
            setActiveGraphId(allGraphs[0].graph.id);
    }, [allGraphs, activeGraphId]);

    const activeBundle = useMemo(
        () =>
            allGraphs.find(
                (bundle: ThreadTaskGraphBundle) =>
                    bundle.graph.id === activeGraphId,
            ) ||
            allGraphs[0] ||
            null,
        [allGraphs, activeGraphId],
    );

    const selectedAssignment = selectedAssignmentId
        ? assignments.find(
              (assignment) => assignment.id === selectedAssignmentId,
          ) || null
        : null;

    if (!threadId)
        return (
            <PageState
                title="Thread not found"
                description="No thread id was provided."
            />
        );
    if (loading)
        return (
            <div className="flex h-full flex-col space-y-4 bg-background p-8">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-64 rounded" />
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <Skeleton className="rounded" />
                    <Skeleton className="rounded" />
                </div>
            </div>
        );
    if (error || !thread)
        return (
            <PageState
                title="Thread not found"
                description="The requested thread could not be loaded."
            />
        );

    const assignedAgentName = thread.agent_id
        ? agentNamesById.get(thread.agent_id)
        : null;
    const threadTitle =
        thread.title ||
        thread.responsibility ||
        `Thread ${thread.id.slice(-6)}`;
    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
            <AgentNavbar
                left={
                    <div className="flex items-center gap-2">
                        <IconRoute
                            size={13}
                            stroke={2}
                            className="text-muted-foreground"
                        />
                        <span className="text-sm font-normal">
                            {project?.name || "Threads"}
                        </span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-normal">{`thr-${thread.id.slice(-6)}`}</span>
                    </div>
                }
                right={
                    <>
                        <StatusPill status={thread.status} />
                        {thread.thread_purpose === "conversation" && (
                            <Link
                                href={`/agents/c/${thread.id}`}
                                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-accent/50"
                            >
                                <IconMessageCircle size={13} stroke={1.5} />
                                <span>Chat</span>
                            </Link>
                        )}
                        <EditThreadDialog
                            thread={thread}
                            agents={agents}
                            onUpdate={async (r) => {
                                await updateThread(r);
                            }}
                        />
                        {(thread.thread_purpose !== "execution" &&
                            thread.thread_purpose !== "review") ||
                        thread.archived_at ? (
                            <button
                                onClick={async () =>
                                    thread.archived_at
                                        ? await unarchiveThread()
                                        : await archiveThread()
                                }
                                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-accent/50"
                            >
                                <IconArchive size={13} stroke={1.5} />
                                <span>
                                    {thread.archived_at
                                        ? "Unarchive"
                                        : "Archive"}
                                </span>
                            </button>
                        ) : null}
                    </>
                }
            />

            <div className="flex-1 overflow-y-auto">
                <main className="flex h-full w-full flex-col gap-6 px-5 py-5 md:px-[30px] md:py-[26px]">
                    {/* ab-head */}
                    <div className="min-w-0">
                        <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                            {project?.name || "Threads"} · thr-
                            {thread.id.slice(-6)}
                        </div>
                        <h1 className="mb-1.5 truncate text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                            {threadTitle}
                        </h1>
                        <p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
                            {thread.responsibility ||
                                `${formatLabel(thread.thread_purpose || "conversation")} thread${
                                    assignedAgentName
                                        ? ` · ${assignedAgentName}`
                                        : ""
                                }.`}
                        </p>
                    </div>

                    {/* thread snapshot */}
                    <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                        <div className="border-b border-border px-[18px] py-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            Thread snapshot
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
                            <ThreadSnapCell
                                k="status"
                                v={(thread.status || "active").replace(/_/g, " ")}
                                vClass={statusHueClass(thread.status)}
                            />
                            <ThreadSnapCell
                                k="purpose"
                                v={(thread.thread_purpose || "conversation").replace(/_/g, " ")}
                            />
                            <ThreadSnapCell
                                k="assignments"
                                v={showAssignments ? orderedAssignments.length : "—"}
                            />
                            <ThreadSnapCell
                                k="progress"
                                v={
                                    latestGraph?.summary
                                        ? `${latestGraph.summary.progress_percent}%`
                                        : "—"
                                }
                            />
                        </div>
                    </div>

                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <section className="min-w-0 overflow-hidden rounded-[10px] border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
                                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                    Assignments
                                </h2>
                                <button
                                    onClick={() => {
                                        void refetchThread();
                                        if (showAssignments)
                                            void refetchAssignments();
                                    }}
                                    className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                    <IconRefresh size={13} />
                                </button>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto">
                                {!showAssignments ? (
                                    <p className="px-[18px] py-10 text-center text-[13px] text-muted-foreground">
                                        Coordinator threads do not receive
                                        assignments.
                                    </p>
                                ) : assignmentsLoading ? (
                                    [...Array(4)].map((_, index) => (
                                        <div key={index} className="px-[18px] py-3">
                                            <Skeleton className="h-9 rounded-[8px]" />
                                        </div>
                                    ))
                                ) : orderedAssignments.length === 0 ? (
                                    <p className="px-[18px] py-10 text-center text-[13px] text-muted-foreground">
                                        No assignments yet.
                                    </p>
                                ) : (
                                    orderedAssignments.map((assignment) => {
                                        const status =
                                            assignment.result_status ||
                                            assignment.status ||
                                            "";
                                        return (
                                            <button
                                                key={assignment.id}
                                                onClick={() => {
                                                    setSelectedAssignmentId(
                                                        assignment.id,
                                                    );
                                                }}
                                                className="grid w-full grid-cols-[8px_minmax(0,1fr)_auto_16px] items-center gap-[14px] border-b border-border px-[18px] py-[13px] text-left last:border-b-0 hover:bg-secondary"
                                            >
                                                {getStatusIndicator(status)}
                                                <div className="min-w-0">
                                                    <div className="truncate text-[13px] font-medium leading-[1.2] text-foreground">
                                                        {formatLabel(
                                                            assignment.assignment_role,
                                                        )}
                                                    </div>
                                                    <div className="mt-[3px] font-mono text-[11px] leading-none text-faint">
                                                        {formatRelativeDate(
                                                            assignment.created_at,
                                                        )}{" "}
                                                        ·{" "}
                                                        {formatTime(
                                                            assignment.created_at,
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[11px] lowercase text-muted-foreground">
                                                    {status.replace(/_/g, " ")}
                                                </span>
                                                <IconChevronRight
                                                    size={14}
                                                    className="justify-self-end text-faint"
                                                />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            {showAssignments &&
                            (assignmentsHasMore || assignmentsLoadingMore) ? (
                                <div className="border-t border-border px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void loadMoreAssignments();
                                        }}
                                        disabled={assignmentsLoadingMore}
                                        className="h-8 rounded-[6px] border border-border px-3 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                                    >
                                        {assignmentsLoadingMore
                                            ? "Loading..."
                                            : "Load more assignments"}
                                    </button>
                                </div>
                            ) : null}
                        </section>

                        <aside className="space-y-4">
                            {thread.status === "waiting_for_input" ||
                            thread.status === "interrupted" ? (
                                <section className="rounded-[10px] border border-warning/30 bg-warning-soft p-[18px]">
                                    <h3 className="mb-3 flex items-center gap-2 text-[13px] font-medium text-warning">
                                        <IconClock size={16} />
                                        Attention Required
                                    </h3>
                                    <ThreadPendingActionPanel
                                        threadId={thread.id}
                                        compact
                                    />
                                </section>
                            ) : null}

                            <section className="overflow-hidden rounded-[10px] border border-border bg-card">
                                <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
                                    <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                        Task graph
                                    </h3>
                                    <button
                                        onClick={() => setShowTaskGraph(true)}
                                        className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Open
                                    </button>
                                </div>
                                <div className="space-y-3 p-[18px]">
                                    {latestGraph?.summary ? (
                                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                                            <div className="rounded-[8px] border border-border bg-secondary px-3 py-2.5">
                                                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                                                    Progress
                                                </div>
                                                <div className="mt-1 text-[15px] font-medium tabular-nums text-foreground">
                                                    {
                                                        latestGraph.summary
                                                            .progress_percent
                                                    }
                                                    %
                                                </div>
                                            </div>
                                            <div className="rounded-[8px] border border-border bg-secondary px-3 py-2.5">
                                                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                                                    Failed nodes
                                                </div>
                                                <div
                                                    className={cn(
                                                        "mt-1 text-[15px] font-medium tabular-nums",
                                                        latestGraph.summary
                                                            .failed_nodes > 0
                                                            ? "text-error"
                                                            : "text-foreground",
                                                    )}
                                                >
                                                    {
                                                        latestGraph.summary
                                                            .failed_nodes
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-muted-foreground">
                                            No graph data available.
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setShowTaskGraph(true)}
                                        className="flex h-8 w-full items-center justify-center gap-2 rounded-[6px] border border-border text-[12px] text-foreground transition-colors hover:bg-secondary"
                                    >
                                        <IconBinaryTree size={14} />
                                        <span>Open graph visualizer</span>
                                    </button>
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-[10px] border border-border bg-card">
                                <div className="border-b border-border px-[18px] py-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                    System instructions
                                </div>
                                <div className="p-[18px]">
                                    {thread.system_instructions ? (
                                        <div className="max-h-90 overflow-y-auto">
                                            <div
                                                className={
                                                    DOCUMENT_PROSE_CLASSNAME
                                                }
                                            >
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                >
                                                    {
                                                        thread.system_instructions
                                                    }
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-muted-foreground">
                                            No instructions defined.
                                        </p>
                                    )}
                                </div>
                            </section>
                        </aside>
                    </div>
                </main>
            </div>

            <ThreadTaskGraphDrawer
                open={showTaskGraph}
                onOpenChange={setShowTaskGraph}
                thread={thread}
                activeBundle={activeBundle}
                allGraphs={allGraphs}
                hasMoreGraphs={hasMoreGraphs}
                loadingMoreGraphs={loadingMoreGraphs}
                activeGraphId={activeGraphId || ""}
                onSelectGraph={setActiveGraphId}
                onReachEnd={() => {
                    void loadMoreGraphs();
                }}
            />

            <Sheet
                open={!!selectedAssignment}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedAssignmentId(null);
                    }
                }}
            >
                <SheetContent className="w-full sm:max-w-[600px] bg-background border-l border-border p-0 flex flex-col">
                    {selectedAssignment && (
                        <>
                            <SheetHeader className="border-b border-border p-6">
                                <SheetTitle className="text-base font-normal">
                                    {`${selectedAssignment.id.slice(-6).toUpperCase()} · ${formatLabel(selectedAssignment.assignment_role)}`}
                                </SheetTitle>
                                <SheetDescription className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>
                                        {formatAssignmentStatus(selectedAssignment)}
                                    </span>
                                    <div className="size-1 rounded-full bg-border" />
                                    <span>
                                        {formatFullTimestamp(selectedAssignment.created_at)}
                                    </span>
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="space-y-6">
                                    {selectedAssignment.instructions && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-foreground">
                                                Instructions
                                            </h4>
                                            <div
                                                className={cn(
                                                    DOCUMENT_PROSE_CLASSNAME,
                                                    "rounded border border-border bg-secondary p-4",
                                                )}
                                            >
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {selectedAssignment.instructions}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    {selectedAssignment.result_summary && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-foreground">
                                                Result Summary
                                            </h4>
                                            <div
                                                className={cn(
                                                    DOCUMENT_PROSE_CLASSNAME,
                                                    "rounded border border-border bg-secondary p-4",
                                                )}
                                            >
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {selectedAssignment.result_summary}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    {selectedAssignment.result_payload && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-foreground">
                                                Payload
                                            </h4>
                                            <div className="overflow-x-auto rounded border border-border bg-secondary p-4 text-sm">
                                                <JsonViewer data={selectedAssignment.result_payload} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
