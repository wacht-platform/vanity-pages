"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useActorProjects, useProjectTaskBoardItem } from "@wacht/nextjs";
import type {
    ActorProject,
    ProjectTaskBoardItemEvent,
    ProjectTaskWorkspaceFileEntry,
} from "@wacht/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    IconArchive,
    IconPaperclip,
    IconPlus,
    IconFileText,
    IconChecklist,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { RichTextMarkdownInput } from "@/components/agent/rich-text-markdown-input";
import { TaskWorkspaceExplorer } from "@/components/agent/task-workspace-explorer";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";

type TaskPaneSelection =
    | { kind: "event"; eventId: string }
    | { kind: "compose" };

type TaskSurfaceTab = "journal" | "files";

const EVENT_NARRATIVE_KEYS = [
    "details",
    "note",
    "message",
    "instructions",
    "feedback",
    "error",
    "reason",
    "output",
];

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

function getPriorityIcon(priority?: string | number) {
    const p = String(priority);
    const bars = (count: number) => (
        <div className="flex gap-[1px] items-end h-[9px]">
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-[2.5px] rounded-[0.5px]",
                        i < count ? "bg-current" : "bg-foreground/10"
                    )}
                    style={{ height: `${(i + 1) * 2 + 2}px` }}
                />
            ))}
        </div>
    );

    switch (p) {
        case "urgent":
        case "1":
            return <div className="text-rose-500">{bars(3)}</div>;
        case "high":
        case "2":
            return <div className="text-amber-500">{bars(2)}</div>;
        case "low":
        case "4":
        case "5":
            return <div className="text-muted-foreground/60">{bars(1)}</div>;
        default:
            return <div className="text-muted-foreground/30">{bars(0)}</div>;
    }
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

function getEventLinkedPaths(event: ProjectTaskBoardItemEvent) {
    if (!event.details || typeof event.details !== "object") return [];

    const details = event.details as Record<string, unknown>;
    const linked = new Set<string>();

    for (const key of ["path", "handoff_file_path"]) {
        const normalized = normalizeWorkspacePath(details[key]);
        if (normalized) linked.add(normalized);
    }

    const attachments = details.attachments;
    if (Array.isArray(attachments)) {
        for (const attachment of attachments) {
            if (!attachment || typeof attachment !== "object") continue;
            const normalized = normalizeWorkspacePath((attachment as Record<string, unknown>).path);
            if (normalized) linked.add(normalized);
        }
    }

    return Array.from(linked);
}

function formatWorkspacePathMarkdown(path: string) {
    return `[\`${path}\`](${workspaceLinkHref(path)})`;
}

function getEventNarrative(event: ProjectTaskBoardItemEvent) {
    if (typeof event.body_markdown === "string" && event.body_markdown.trim()) {
        return event.body_markdown;
    }

    if (!event.details || typeof event.details !== "object") return null;

    const details = event.details as Record<string, unknown>;

    for (const key of EVENT_NARRATIVE_KEYS) {
        const value = details[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    return null;
}

function getEventDetailEntries(event: ProjectTaskBoardItemEvent) {
    if (!event.details || typeof event.details !== "object") return [];

    const details = event.details as Record<string, unknown>;
    const hiddenKeys = new Set([...EVENT_NARRATIVE_KEYS, "attachments"]);

    return Object.entries(details)
        .filter(([key, value]) => {
            if (hiddenKeys.has(key)) return false;
            return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
        })
        .map(([key, value]) => ({
            key,
            label: key.replace(/_/g, " "),
            value: String(value),
            mono: key.includes("path") || key.endsWith("_id"),
        }));
}

function getEventDocumentPath(event: ProjectTaskBoardItemEvent) {
    const date = event.created_at ? new Date(event.created_at) : null;
    const stamp =
        date && !Number.isNaN(date.getTime())
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}`
            : "entry";
    const type = event.event_type.replace(/_/g, "-");

    return `activity/${stamp}-${type}.md`;
}

function getEventDocumentName(event: ProjectTaskBoardItemEvent) {
    return getEventDocumentPath(event).split("/").pop() || "entry.md";
}

function getEventAttachmentCount(event: ProjectTaskBoardItemEvent) {
    if (!event.details || typeof event.details !== "object") return 0;
    const details = event.details as Record<string, unknown>;
    return Array.isArray(details.attachments) ? details.attachments.length : 0;
}

function getJournalListTitle(event: ProjectTaskBoardItemEvent) {
    const summary = event.summary?.trim();
    if (summary) return summary;
    return getEventDocumentName(event);
}

function getJournalListMeta(event: ProjectTaskBoardItemEvent) {
    const parts: string[] = [];
    const time = formatTime(event.created_at);
    if (time) parts.push(time);
    const attachments = getEventAttachmentCount(event);
    if (attachments > 0) {
        parts.push(`${attachments} file${attachments === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
}

function buildEventMarkdown(event: ProjectTaskBoardItemEvent) {
    const lines: string[] = [`# ${event.summary || event.event_type.replace(/_/g, " ")}`];
    const narrative = getEventNarrative(event);
    const details = getEventDetailEntries(event);
    const linkedPaths = getEventLinkedPaths(event);

    lines.push("");
    if (event.created_at) {
        lines.push(`- Logged: ${new Date(event.created_at).toLocaleString()}`);
    }

    if (narrative) {
        lines.push("");
        lines.push(narrative);
    }

    if (details.length > 0) {
        lines.push("");
        lines.push("## Structured Fields");
        lines.push("");
        for (const detail of details) {
            lines.push(
                `- **${detail.label}**: ${
                    isWorkspacePath(detail.value)
                        ? formatWorkspacePathMarkdown(detail.value)
                        : detail.value
                }`,
            );
        }
    }

    if (linkedPaths.length > 0) {
        lines.push("");
        lines.push("## Linked Files");
        lines.push("");
        for (const path of linkedPaths) {
            lines.push(`- ${formatWorkspacePathMarkdown(path)}`);
        }
    }

    return lines.join("\n");
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
        events,
        loading,
        error,
        archiveItem,
        unarchiveItem,
        appendJournal,
        taskWorkspace,
        taskWorkspaceLoading,
        taskWorkspaceError,
        getTaskWorkspaceFile,
        listTaskWorkspaceDirectory,
        refetchTaskWorkspace,
    } = useProjectTaskBoardItem(taskId, !!taskId, { includeArchived: true });

    const workspaceEntries = React.useMemo<ProjectTaskWorkspaceFileEntry[]>(
        () => taskWorkspace?.files || [],
        [taskWorkspace],
    );
    const orderedEvents = React.useMemo<ProjectTaskBoardItemEvent[]>(
        () =>
            [...events].sort(
                (a: ProjectTaskBoardItemEvent, b: ProjectTaskBoardItemEvent) =>
                    timestampValue(b.created_at) - timestampValue(a.created_at),
            ),
        [events],
    );

    const [activeTab, setActiveTab] = React.useState<TaskSurfaceTab>("journal");
    const [selection, setSelection] = React.useState<TaskPaneSelection | null>(null);
    const [requestedWorkspacePath, setRequestedWorkspacePath] = React.useState<string | null>(null);
    const [journalSummary, setJournalSummary] = React.useState("");
    const [journalBody, setJournalBody] = React.useState("");
    const [journalFiles, setJournalFiles] = React.useState<File[]>([]);
    const [journalSubmitting, setJournalSubmitting] = React.useState(false);
    const [journalSubmitError, setJournalSubmitError] = React.useState<string | null>(null);
    const journalFileInputRef = React.useRef<HTMLInputElement | null>(null);

    const selectedEvent =
        selection?.kind === "event"
            ? events.find(
                  (event: ProjectTaskBoardItemEvent) =>
                      event.id === selection.eventId,
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
        if (!selection && orderedEvents.length > 0) {
            setSelection({ kind: "event", eventId: orderedEvents[0].id });
        }
    }, [selection, orderedEvents]);

    const handleSubmitJournal = async () => {
        const summary = journalSummary.trim();
        if (!summary) return;
        setJournalSubmitting(true);
        setJournalSubmitError(null);
        try {
            const event = await appendJournal({ summary, body_markdown: journalBody.trim() || undefined }, journalFiles);
            setJournalSummary(""); setJournalBody(""); setJournalFiles([]);
            setSelection({ kind: "event", eventId: event.id });
        } catch (err) {
            setJournalSubmitError(err instanceof Error ? err.message : "Failed to save journal.");
        } finally {
            setJournalSubmitting(false);
        }
    };

    const handleJournalFilesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setJournalFiles(Array.from(event.target.files || []));
    };

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
                    <div className="flex items-center gap-2">
                        {getPriorityIcon(item.priority)}
                    </div>
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
                                {(["journal", "files"] as const).map((tab) => (
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
                            {activeTab === "journal" ? (
                                <button
                                    onClick={() => setSelection({ kind: "compose" })}
                                    className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <IconPlus size={14} stroke={2} />
                                </button>
                            ) : null}
                        </div>

                        {activeTab === "files" ? (
                            <TaskWorkspaceExplorer
                                rootEntries={workspaceEntries}
                                rootLoading={taskWorkspaceLoading}
                                rootError={taskWorkspaceError ? String(taskWorkspaceError) : null}
                                getFile={getTaskWorkspaceFile}
                                listDirectory={listTaskWorkspaceDirectory}
                                refetchRoot={refetchTaskWorkspace}
                                requestedPath={requestedWorkspacePath}
                            />
                        ) : (
                            <div className="flex min-h-0 flex-1">
                                <div className="flex w-[300px] flex-col border-r border-border/50">
                                    <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
                                        <div className="space-y-px">
                                            {orderedEvents.map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => setSelection({ kind: "event", eventId: event.id })}
                                                    className={cn(
                                                        "group flex w-full items-center gap-3 rounded px-3 py-1.5 text-left transition-all",
                                                        selection?.kind === "event" && selection.eventId === event.id ? "bg-accent/40" : "hover:bg-accent/20"
                                                    )}
                                                >
                                                    <IconFileText
                                                        size={14}
                                                        className={cn(
                                                            "shrink-0",
                                                            selection?.kind === "event" && selection.eventId === event.id ? "text-foreground" : "text-muted-foreground/60"
                                                        )}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-normal">{getJournalListTitle(event)}</div>
                                                        <div className="text-xs text-muted-foreground/60">{getJournalListMeta(event)}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col bg-background">
                                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4 md:px-5">
                                        <div className="max-w-md truncate text-sm font-normal text-muted-foreground">
                                            {selection?.kind === "event" ? getEventDocumentPath(selectedEvent!) : "New Entry"}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5" onClickCapture={handleWorkspaceLinkClickCapture}>
                                        {selection?.kind === "compose" ? (
                                            <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <input
                                                    autoFocus
                                                    value={journalSummary}
                                                    onChange={(e) => setJournalSummary(e.target.value)}
                                                    placeholder="Entry title"
                                                    className="w-full bg-transparent text-base font-normal outline-none placeholder:text-muted-foreground/40"
                                                />
                                                <RichTextMarkdownInput
                                                    value={journalBody}
                                                    onChange={setJournalBody}
                                                    placeholder="Document findings, thoughts, or next steps..."
                                                    contentClassName="min-h-[300px] text-sm leading-relaxed"
                                                />
                                                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => journalFileInputRef.current?.click()} className="flex h-8 items-center gap-2 rounded-md bg-secondary/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
                                                            <IconPaperclip size={14} />
                                                            <span>{journalFiles.length > 0 ? `${journalFiles.length} files` : "Attach"}</span>
                                                        </button>
                                                        <input ref={journalFileInputRef} type="file" multiple className="hidden" onChange={handleJournalFilesChange} />
                                                        {journalSubmitError ? <p className="text-sm text-rose-500">{journalSubmitError}</p> : null}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setSelection({ kind: "event", eventId: orderedEvents[0]?.id })} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                                        <button
                                                            onClick={handleSubmitJournal}
                                                            disabled={!journalSummary.trim() || journalSubmitting}
                                                            className="h-8 rounded bg-primary px-5 text-sm font-normal text-primary-foreground disabled:opacity-50"
                                                        >
                                                            {journalSubmitting ? "Saving..." : "Save Entry"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : selection?.kind === "event" && selectedEvent ? (
                                            <div className={DOCUMENT_PROSE_CLASSNAME}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkWorkspaceLinks]} components={markdownComponents}>
                                                    {buildEventMarkdown(selectedEvent)}
                                                </ReactMarkdown>
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
