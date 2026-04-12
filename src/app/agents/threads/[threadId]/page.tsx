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
} from "@tabler/icons-react";
import {
    useActorProjects,
    useAgentThread,
    useAgentThreadAssignments,
    useAgentThreadEvents,
    useAgentThreadTaskGraphs,
} from "@wacht/nextjs";
import type {
    ActorProject,
    ProjectTaskBoardItemAssignment,
    ThreadEvent,
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

type ThreadSurfaceTab = "events" | "assignments";

const DOCUMENT_PROSE_CLASSNAME =
    "prose prose-sm prose-invert max-w-none text-sm leading-6 text-muted-foreground font-normal " +
    "prose-p:text-muted-foreground prose-li:text-muted-foreground prose-ul:my-1 prose-li:my-0 " +
    "prose-strong:text-foreground prose-a:text-foreground prose-code:text-foreground prose-code:bg-accent/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-normal " +
    "prose-pre:bg-accent/20 prose-pre:border prose-pre:border-divider/50 prose-pre:rounded-md " +
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
        completed: "bg-emerald-500",
        failed: "bg-rose-500",
        blocked: "bg-rose-500",
        rejected: "bg-rose-500",
        running: "bg-blue-500 animate-pulse",
        in_progress: "bg-blue-500",
        available: "bg-amber-500",
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
    const {
        events,
        loading: eventsLoading,
        hasMore: eventsHasMore,
        loadingMore: eventsLoadingMore,
        loadMore: loadMoreEvents,
        refetch: refetchEvents,
    } = useAgentThreadEvents(threadId, { enabled: !!threadId });
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

    const orderedEvents = useMemo(
        () =>
            [...events].sort(
                (a, b) =>
                    timestampValue(b.created_at) - timestampValue(a.created_at),
            ),
        [events],
    );
    const orderedAssignments = useMemo(
        () =>
            [...assignments].sort(
                (a, b) =>
                    a.assignment_order - b.assignment_order ||
                    timestampValue(b.updated_at) - timestampValue(a.updated_at),
            ),
        [assignments],
    );
    const [activeTab, setActiveTab] =
        React.useState<ThreadSurfaceTab>("events");
    const [selectedEventId, setSelectedEventId] = React.useState<string | null>(
        null,
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

    const selectedEvent = selectedEventId
        ? events.find((event: ThreadEvent) => event.id === selectedEventId) ||
          null
        : null;
    const selectedAssignment = selectedAssignmentId
        ? assignments.find(
              (assignment: ProjectTaskBoardItemAssignment) =>
                  assignment.id === selectedAssignmentId,
          ) || null
        : null;
    const selectedActivity = selectedAssignment
        ? { kind: "assignment" as const, assignment: selectedAssignment }
        : selectedEvent
          ? { kind: "event" as const, event: selectedEvent }
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
                        <div className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1 text-sm text-muted-foreground">
                            {getStatusIndicator(thread.status)}
                            <span>
                                {thread.status?.replace(/_/g, " ") || "Active"}
                            </span>
                        </div>
                        {thread.thread_purpose === "conversation" && (
                            <Link
                                href={`/agents/c/${thread.id}`}
                                className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 px-3 text-sm transition-colors hover:bg-accent/50"
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
                                className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 px-3 text-sm transition-colors hover:bg-accent/50"
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
                <main className="flex h-full w-full flex-col gap-6 px-4 py-4 md:px-5">
                    <section className="border-b border-border/50 pb-4">
                        <div className="min-w-0 space-y-2">
                            <h1 className="truncate text-base font-normal text-foreground">
                                {threadTitle}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span>
                                    {thread.thread_purpose?.replace(
                                        /_/g,
                                        " ",
                                    ) || "conversation"}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>
                                    {thread.reusable ? "Reusable" : "One-off"}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>
                                    {thread.accepts_assignments
                                        ? "Assignable"
                                        : "Internal"}
                                </span>
                                {assignedAgentName ? (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-border" />
                                        <span>{assignedAgentName}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <section className="min-w-0 overflow-hidden rounded-lg border border-border/50">
                            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                                <h2 className="text-sm font-normal">
                                    Activity
                                </h2>
                                <button
                                    onClick={() => {
                                        void refetchThread();
                                        void refetchEvents();
                                        if (showAssignments)
                                            void refetchAssignments();
                                    }}
                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                    <IconRefresh size={13} />
                                </button>
                            </div>
                            <div className="border-b border-border/50 px-4 py-2">
                                {showAssignments ? (
                                    <div className="flex rounded-md border border-border/40 p-0.5">
                                        {(
                                            ["events", "assignments"] as const
                                        ).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() =>
                                                    setActiveTab(tab)
                                                }
                                                className={cn(
                                                    "flex-1 rounded px-2.5 py-0.5 text-sm font-normal capitalize transition-all",
                                                    activeTab === tab
                                                        ? "border border-border bg-background text-foreground"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        Events
                                    </div>
                                )}
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto">
                                {activeTab === "events"
                                    ? eventsLoading
                                        ? [...Array(4)].map((_, index) => (
                                              <div
                                                  key={index}
                                                  className="p-2.5"
                                              >
                                                  <Skeleton className="h-10 rounded" />
                                              </div>
                                          ))
                                        : orderedEvents.map((event) => (
                                              <button
                                                  key={event.id}
                                                  onClick={() => {
                                                      setSelectedEventId(
                                                          event.id,
                                                      );
                                                      setSelectedAssignmentId(
                                                          null,
                                                      );
                                                  }}
                                                  className="flex w-full items-start gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-accent/20"
                                              >
                                                  <div className="mt-1">
                                                      {getStatusIndicator(
                                                          event.status,
                                                      )}
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                      <div className="truncate text-sm text-foreground">
                                                          {formatLabel(
                                                              event.event_type,
                                                          )}
                                                      </div>
                                                      <div className="mt-1 text-sm text-muted-foreground">
                                                          {formatRelativeDate(
                                                              event.created_at,
                                                          )}{" "}
                                                          ·{" "}
                                                          {formatTime(
                                                              event.created_at,
                                                          )}
                                                      </div>
                                                  </div>
                                              </button>
                                          ))
                                    : assignmentsLoading
                                      ? [...Array(4)].map((_, index) => (
                                            <div key={index} className="p-2.5">
                                                <Skeleton className="h-10 rounded" />
                                            </div>
                                        ))
                                      : orderedAssignments.map((assignment) => (
                                            <button
                                                key={assignment.id}
                                                onClick={() => {
                                                    setSelectedAssignmentId(
                                                        assignment.id,
                                                    );
                                                    setSelectedEventId(null);
                                                }}
                                                className="flex w-full items-start gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-accent/20"
                                            >
                                                <div className="mt-1">
                                                    {getStatusIndicator(
                                                        assignment.result_status ||
                                                            assignment.status,
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm text-foreground">
                                                        {`${assignment.assignment_order}. ${formatLabel(assignment.assignment_role)}`}
                                                    </div>
                                                    <div className="mt-1 text-sm text-muted-foreground">
                                                        {formatRelativeDate(
                                                            assignment.created_at,
                                                        )}{" "}
                                                        ·{" "}
                                                        {formatTime(
                                                            assignment.created_at,
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                {(activeTab === "events" &&
                                    !eventsLoading &&
                                    orderedEvents.length === 0) ||
                                (activeTab === "assignments" &&
                                    !assignmentsLoading &&
                                    orderedAssignments.length === 0) ? (
                                    <p className="px-4 py-10 text-sm text-muted-foreground">
                                        No activity yet.
                                    </p>
                                ) : null}
                            </div>
                            {(activeTab === "events" &&
                                (eventsHasMore || eventsLoadingMore)) ||
                            (activeTab === "assignments" &&
                                (assignmentsHasMore ||
                                    assignmentsLoadingMore)) ? (
                                <div className="border-t border-border/50 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (activeTab === "events") {
                                                void loadMoreEvents();
                                                return;
                                            }
                                            void loadMoreAssignments();
                                        }}
                                        disabled={
                                            activeTab === "events"
                                                ? eventsLoadingMore
                                                : assignmentsLoadingMore
                                        }
                                        className="h-8 rounded-md border border-border/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                                    >
                                        {activeTab === "events"
                                            ? eventsLoadingMore
                                                ? "Loading..."
                                                : "Load More Events"
                                            : assignmentsLoadingMore
                                              ? "Loading..."
                                              : "Load More Assignments"}
                                    </button>
                                </div>
                            ) : null}
                        </section>

                        <aside className="space-y-4">
                            {thread.status === "waiting_for_input" ||
                            thread.status === "interrupted" ? (
                                <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-normal text-amber-500">
                                        <IconClock size={16} />
                                        Attention Required
                                    </h3>
                                    <ThreadPendingActionPanel
                                        threadId={thread.id}
                                        compact
                                    />
                                </section>
                            ) : null}

                            <section className="rounded-lg border border-border/50 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-normal">
                                        Task Graph
                                    </h3>
                                    <button
                                        onClick={() => setShowTaskGraph(true)}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Open
                                    </button>
                                </div>
                                {latestGraph?.summary ? (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                        <div className="rounded-md border border-border/40 px-3 py-3">
                                            <div className="text-sm text-muted-foreground">
                                                Progress
                                            </div>
                                            <div className="mt-1 text-sm text-foreground">
                                                {
                                                    latestGraph.summary
                                                        .progress_percent
                                                }
                                                %
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-border/40 px-3 py-3">
                                            <div className="text-sm text-muted-foreground">
                                                Failed nodes
                                            </div>
                                            <div className="mt-1 text-sm text-foreground">
                                                {
                                                    latestGraph.summary
                                                        .failed_nodes
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No graph data available.
                                    </p>
                                )}
                                <button
                                    onClick={() => setShowTaskGraph(true)}
                                    className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md border border-border/50 text-sm text-foreground transition-colors hover:bg-accent/40"
                                >
                                    <IconBinaryTree size={14} />
                                    <span>Open Graph Visualizer</span>
                                </button>
                            </section>

                            <section className="rounded-lg border border-border/50 p-4">
                                <h3 className="mb-3 text-sm font-normal">
                                    System Instructions
                                </h3>
                                {thread.system_instructions ? (
                                    <div className="max-h-90 overflow-y-auto">
                                        <div
                                            className={DOCUMENT_PROSE_CLASSNAME}
                                        >
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {thread.system_instructions}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No instructions defined.
                                    </p>
                                )}
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
                open={!!selectedActivity}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedEventId(null);
                        setSelectedAssignmentId(null);
                    }
                }}
            >
                <SheetContent className="w-full sm:max-w-[600px] bg-background border-l border-divider p-0 flex flex-col">
                    {selectedActivity && (
                        <>
                            <SheetHeader className="border-b border-divider p-6">
                                <SheetTitle className="text-base font-normal">
                                    {selectedActivity.kind === "assignment"
                                        ? `${selectedActivity.assignment.id.slice(-6).toUpperCase()} · ${formatLabel(selectedActivity.assignment.assignment_role)}`
                                        : formatLabel(
                                              selectedActivity.event.event_type,
                                          )}
                                </SheetTitle>
                                <SheetDescription className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>
                                        {selectedActivity.kind === "assignment"
                                            ? formatAssignmentStatus(
                                                  selectedActivity.assignment,
                                              )
                                            : formatLabel(
                                                  selectedActivity.event.status,
                                              )}
                                    </span>
                                    <div className="size-1 rounded-full bg-divider" />
                                    <span>
                                        {formatFullTimestamp(
                                            selectedActivity.kind ===
                                                "assignment"
                                                ? selectedActivity.assignment
                                                      .created_at
                                                : selectedActivity.event
                                                      .created_at,
                                        )}
                                    </span>
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {selectedActivity.kind === "assignment" && (
                                    <div className="space-y-6">
                                        {selectedActivity.assignment
                                            .instructions && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-foreground">
                                                    Instructions
                                                </h4>
                                                <div
                                                    className={cn(
                                                        DOCUMENT_PROSE_CLASSNAME,
                                                        "rounded border border-border/30 bg-secondary/20 p-4",
                                                    )}
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[
                                                            remarkGfm,
                                                        ]}
                                                    >
                                                        {
                                                            selectedActivity
                                                                .assignment
                                                                .instructions
                                                        }
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                        {selectedActivity.assignment
                                            .result_summary && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-foreground">
                                                    Result Summary
                                                </h4>
                                                <div
                                                    className={cn(
                                                        DOCUMENT_PROSE_CLASSNAME,
                                                        "rounded border border-border/30 bg-secondary/20 p-4",
                                                    )}
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[
                                                            remarkGfm,
                                                        ]}
                                                    >
                                                        {
                                                            selectedActivity
                                                                .assignment
                                                                .result_summary
                                                        }
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                        {selectedActivity.assignment
                                            .result_payload && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-foreground">
                                                    Payload
                                                </h4>
                                                <div className="overflow-x-auto rounded border border-border/30 bg-secondary/20 p-4 text-sm">
                                                    <JsonViewer
                                                        data={
                                                            selectedActivity
                                                                .assignment
                                                                .result_payload
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {selectedActivity.kind === "event" && (
                                    <div className="space-y-6">
                                        {selectedActivity.event.payload && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-foreground">
                                                    Payload
                                                </h4>
                                                <div className="overflow-x-auto rounded border border-border/30 bg-secondary/20 p-4 text-sm">
                                                    <JsonViewer
                                                        data={
                                                            selectedActivity
                                                                .event.payload
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
