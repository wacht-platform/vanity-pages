"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useActorProjects, useProjectTasks } from "@wacht/nextjs";
import type { ActorProject, ProjectTaskBoardItem } from "@wacht/types";
import { IconPaperclip, IconPlus, IconChecklist } from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { RichTextMarkdownInput } from "@/components/agent/rich-text-markdown-input";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TASK_CARD_MARKDOWN_CLASSNAME =
    "max-w-none text-sm leading-5 text-muted-foreground " +
    "[&_p]:m-0 [&_p]:text-sm [&_p]:leading-5 [&_p]:text-muted-foreground " +
    "[&_ul]:my-0 [&_ul]:pl-4 [&_ol]:my-0 [&_ol]:pl-4 " +
    "[&_li]:my-0.5 [&_li]:text-sm [&_li]:leading-5 " +
    "[&_strong]:font-normal [&_strong]:text-foreground " +
    "[&_em]:italic [&_em]:text-muted-foreground " +
    "[&_code]:rounded-sm [&_code]:bg-accent/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.8125rem] [&_code]:text-foreground " +
    "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/50 [&_pre]:bg-accent/20 [&_pre]:p-3 [&_pre]:text-[0.8125rem] [&_pre]:leading-5";

function formatRelativeDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function getPriorityIcon(priority?: string | number) {
    const p = String(priority);
    const bars = (count: number) => (
        <div className="flex gap-[1.5px] items-end h-2.5">
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-0.75 rounded-[0.5px]",
                        i < count ? "bg-current" : "bg-foreground/10",
                    )}
                    style={{ height: `${(i + 1) * 2.5 + 2}px` }}
                />
            ))}
        </div>
    );

    switch (p) {
        case "urgent":
        case "1":
            return (
                <div className="text-rose-500 flex items-center">{bars(3)}</div>
            );
        case "high":
        case "2":
            return (
                <div className="text-amber-500 flex items-center">
                    {bars(2)}
                </div>
            );
        case "low":
        case "4":
        case "5":
            return (
                <div className="text-muted-foreground/60 flex items-center">
                    {bars(1)}
                </div>
            );
        default:
            return (
                <div className="text-muted-foreground/30 flex items-center">
                    {bars(0)}
                </div>
            );
    }
}

const TASK_COLUMNS = [
    {
        id: "intake",
        title: "Intake",
        statuses: ["pending", "available"],
    },
    {
        id: "active",
        title: "Active",
        statuses: ["claimed", "in_progress", "running"],
    },
    {
        id: "review",
        title: "Review",
        statuses: ["awaiting_review"],
    },
    {
        id: "blocked",
        title: "Blocked",
        statuses: ["blocked"],
    },
    {
        id: "done",
        title: "Done",
        statuses: ["completed"],
    },
    {
        id: "failed",
        title: "Failed",
        statuses: ["failed"],
    },
] as const;

function TaskBoardLoading() {
    const loadingColumns = [
        { id: "archived", title: "Archived" },
        ...TASK_COLUMNS.map((column) => ({
            id: column.id,
            title: column.title,
        })),
    ];

    return (
        <div className="flex flex-col">
            <div className="border-b border-border/50">
                <div className="flex w-full flex-col gap-3 px-4 py-4 md:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                </div>
            </div>

            <div className="flex w-full flex-col gap-6 px-4 py-4 md:px-5">
                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                                Task Board
                            </span>
                            <Skeleton className="h-4 w-8" />
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-1">
                        <div className="grid min-w-max gap-4 lg:grid-cols-7">
                            {loadingColumns.map((column, index) => (
                                <section
                                    key={column.id}
                                    className="flex h-[70vh] min-h-[560px] w-[280px] flex-col"
                                >
                                    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                        <h2 className="text-sm font-normal text-foreground">
                                            {column.title}
                                        </h2>
                                        <Skeleton className="h-5 w-7 rounded-md" />
                                    </div>
                                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-3">
                                        {Array.from({
                                            length: index === 0 ? 2 : 3,
                                        }).map((_, cardIndex) => (
                                            <div
                                                key={`${column.id}-${cardIndex}`}
                                                className="rounded-lg border border-border/60 bg-background p-3 shadow-sm"
                                            >
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-4/5" />
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-14" />
                                                            <Skeleton className="h-1 w-1 rounded-full" />
                                                            <Skeleton className="h-3 w-12" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="mt-0.5 h-3 w-3 rounded-sm" />
                                                </div>
                                                <div className="mb-3 space-y-2">
                                                    <Skeleton className="h-3 w-full" />
                                                    <Skeleton className="h-3 w-[88%]" />
                                                    {cardIndex % 2 === 0 ? (
                                                        <Skeleton className="h-3 w-[62%]" />
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <Skeleton className="h-6 w-20 rounded-md" />
                                                    <Skeleton className="h-3 w-12" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
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
    const [isInlineFormOpen, setIsInlineFormOpen] = React.useState(false);
    const [inlineTitle, setInlineTitle] = React.useState("");
    const [inlineDescription, setInlineDescription] = React.useState("");
    const [inlineFiles, setInlineFiles] = React.useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const inlineFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const {
        tasks: activeTasks,
        loading: activeTasksLoading,
        error: activeTasksError,
        hasMore: activeHasMore,
        loadingMore: activeLoadingMore,
        loadMore: loadMoreActiveTasks,
        createTask,
        archiveTask,
    } = useProjectTasks(projectId, !!projectId, {
        limit: 72,
    });
    const {
        tasks: archivedTasks,
        loading: archivedTasksLoading,
        error: archivedTasksError,
        hasMore: archivedHasMore,
        loadingMore: archivedLoadingMore,
        loadMore: loadMoreArchivedTasks,
        unarchiveTask,
    } = useProjectTasks(projectId, !!projectId, {
        archivedOnly: true,
        limit: 24,
    });

    const groupedOpenTasks = React.useMemo(
        () =>
            TASK_COLUMNS.map((column) => ({
                ...column,
                tasks: activeTasks.filter((task: ProjectTaskBoardItem) =>
                    column.statuses.some(
                        (status) => status === (task.status || "pending"),
                    ),
                ),
            })),
        [activeTasks],
    );

    const resetInlineForm = React.useCallback(() => {
        setInlineTitle("");
        setInlineDescription("");
        setInlineFiles([]);
        setIsInlineFormOpen(false);
    }, []);

    const submitInlineTask = React.useCallback(async () => {
        if (!inlineTitle.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await createTask(
                {
                    title: inlineTitle.trim(),
                    description: inlineDescription.trim() || undefined,
                    priority: "neutral",
                },
                inlineFiles,
            );
            resetInlineForm();
        } finally {
            setIsSubmitting(false);
        }
    }, [
        createTask,
        inlineDescription,
        inlineFiles,
        inlineTitle,
        isSubmitting,
        resetInlineForm,
    ]);

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
    if (activeTasksError || archivedTasksError) {
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTasksLoading && archivedTasksLoading ? (
                    <TaskBoardLoading />
                ) : (
                    <div className="flex flex-col">
                        <div className="border-b border-border/50">
                            <div className="flex w-full flex-col gap-3 px-4 py-4 md:px-5">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>{activeTasks.length} active</span>
                                        <span>
                                            {archivedTasks.length} archived
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsInlineFormOpen(
                                                (current) => !current,
                                            )
                                        }
                                        className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-normal text-primary-foreground transition-colors"
                                    >
                                        <IconPlus size={13} stroke={2.5} />
                                        <span>New Task</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Inline Form Container */}
                        {isInlineFormOpen && (
                            <div className="border-b border-border/50">
                                <div className="px-4 py-4 md:px-5">
                                    <div className="rounded-lg border border-border/60 bg-background p-4">
                                        <input
                                            autoFocus
                                            value={inlineTitle}
                                            onChange={(e) =>
                                                setInlineTitle(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    inlineTitle.trim()
                                                )
                                                    submitInlineTask();
                                                if (e.key === "Escape")
                                                    resetInlineForm();
                                            }}
                                            className="mb-3 w-full border-none bg-transparent text-base font-normal outline-none placeholder:text-muted-foreground"
                                            placeholder="What needs to be done?"
                                        />
                                        <RichTextMarkdownInput
                                            value={inlineDescription}
                                            onChange={setInlineDescription}
                                            placeholder="Add more details..."
                                            contentClassName="min-h-[100px] text-sm leading-relaxed"
                                        />
                                        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        inlineFileInputRef.current?.click()
                                                    }
                                                    className="flex h-7 items-center gap-1.5 rounded-md bg-secondary/50 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                                                >
                                                    <IconPaperclip
                                                        size={12}
                                                        stroke={2}
                                                    />
                                                    <span>Attach</span>
                                                </button>
                                                <input
                                                    ref={inlineFileInputRef}
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        setInlineFiles(
                                                            Array.from(
                                                                e.target
                                                                    .files ||
                                                                    [],
                                                            ),
                                                        )
                                                    }
                                                />
                                                {inlineFiles.length > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {inlineFiles.length}{" "}
                                                        files
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={resetInlineForm}
                                                    className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={
                                                        !inlineTitle.trim() ||
                                                        isSubmitting
                                                    }
                                                    onClick={submitInlineTask}
                                                    className="h-8 rounded-md bg-primary px-4 text-sm font-normal text-primary-foreground transition-opacity disabled:opacity-50"
                                                >
                                                    {isSubmitting
                                                        ? "Creating..."
                                                        : "Create Task"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex w-full flex-col gap-6 px-4 py-4 md:px-5">
                            <section className="flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-foreground">
                                            Task Board
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {activeTasks.length +
                                                archivedTasks.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto pb-1">
                                    <div className="grid min-w-max gap-4 lg:grid-cols-7">
                                        <section className="flex h-[70vh] min-h-[560px] w-[280px] flex-col">
                                            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                                <h2 className="text-sm font-normal text-foreground">
                                                    Archived
                                                </h2>
                                                <span className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                                                    {archivedTasks.length}
                                                </span>
                                            </div>
                                            <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-3">
                                                {archivedTasks.length === 0 ? (
                                                    <div className="mx-3 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground">
                                                        No tasks
                                                    </div>
                                                ) : (
                                                    archivedTasks.map(
                                                        (
                                                            task: ProjectTaskBoardItem,
                                                        ) => (
                                                            <ArchivedTaskCard
                                                                key={task.id}
                                                                task={task}
                                                                href={`/agents/p/${projectId}/tasks/${task.id}`}
                                                                onRestore={async () => {
                                                                    await unarchiveTask(
                                                                        task.id,
                                                                    );
                                                                }}
                                                            />
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </section>

                                        {groupedOpenTasks.map((column) => (
                                            <section
                                                key={column.id}
                                                className="flex h-[70vh] min-h-140 w-70 flex-col"
                                            >
                                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                                    <h2 className="text-sm font-normal text-foreground">
                                                        {column.title}
                                                    </h2>
                                                    <span className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        {column.tasks.length}
                                                    </span>
                                                </div>
                                                <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-3">
                                                    {column.tasks.length ===
                                                    0 ? (
                                                        <div className="mx-3 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground">
                                                            No tasks
                                                        </div>
                                                    ) : (
                                                        column.tasks.map(
                                                            (
                                                                task: ProjectTaskBoardItem,
                                                            ) => (
                                                                <TaskCard
                                                                    key={
                                                                        task.id
                                                                    }
                                                                    task={task}
                                                                    href={`/agents/p/${projectId}/tasks/${task.id}`}
                                                                    onArchive={async () => {
                                                                        await archiveTask(
                                                                            task.id,
                                                                        );
                                                                    }}
                                                                />
                                                            ),
                                                        )
                                                    )}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                </div>

                                {archivedHasMore ||
                                archivedLoadingMore ||
                                activeHasMore ||
                                activeLoadingMore ? (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {archivedHasMore ||
                                        archivedLoadingMore ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void loadMoreArchivedTasks()
                                                }
                                                disabled={archivedLoadingMore}
                                                className="h-8 rounded-md border border-border/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                                            >
                                                {archivedLoadingMore
                                                    ? "Loading..."
                                                    : "Load More Archived"}
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void loadMoreActiveTasks()
                                            }
                                            disabled={activeLoadingMore}
                                            className="h-8 rounded-md border border-border/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                                        >
                                            {activeLoadingMore
                                                ? "Loading..."
                                                : "Load More Tasks"}
                                        </button>
                                    </div>
                                ) : null}
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function shouldIgnoreCardNavigation(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return !!target.closest("button, a");
}

function TaskCard({
    task,
    href,
    onArchive,
}: {
    task: ProjectTaskBoardItem;
    href: string;
    onArchive: () => Promise<void>;
}) {
    const router = useRouter();

    return (
        <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
                if (shouldIgnoreCardNavigation(event.target)) return;
                router.push(href);
            }}
            onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (shouldIgnoreCardNavigation(event.target)) return;
                event.preventDefault();
                router.push(href);
            }}
            className="cursor-pointer rounded-lg border border-border/60 bg-background p-3 shadow-sm transition-colors hover:bg-accent/20"
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link
                        href={href}
                        className="block truncate text-sm text-foreground"
                    >
                        {task.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {task.task_key?.substring(0, 8) ||
                                `TSK-${task.id.slice(0, 4)}`}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{formatRelativeDate(task.created_at)}</span>
                    </div>
                </div>
                <div className="w-4 flex justify-center">
                    {getPriorityIcon(task.priority)}
                </div>
            </div>

            {task.description ? (
                <div className="mb-3 max-h-28 overflow-hidden">
                    <div className={TASK_CARD_MARKDOWN_CLASSNAME}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.description}
                        </ReactMarkdown>
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                    {(task.status || "pending").replace(/_/g, " ")}
                </span>
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onArchive();
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                    Archive
                </button>
            </div>
        </div>
    );
}

function ArchivedTaskCard({
    task,
    href,
    onRestore,
}: {
    task: ProjectTaskBoardItem;
    href: string;
    onRestore: () => Promise<void>;
}) {
    const router = useRouter();

    return (
        <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
                if (shouldIgnoreCardNavigation(event.target)) return;
                router.push(href);
            }}
            onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (shouldIgnoreCardNavigation(event.target)) return;
                event.preventDefault();
                router.push(href);
            }}
            className="cursor-pointer rounded-lg border border-border/60 bg-background p-3 shadow-sm transition-colors hover:bg-accent/20"
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link
                        href={href}
                        className="block truncate text-sm text-foreground"
                    >
                        {task.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {task.task_key?.substring(0, 8) ||
                                `TSK-${task.id.slice(0, 4)}`}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{formatRelativeDate(task.created_at)}</span>
                    </div>
                </div>
                <div className="w-4 flex justify-center">
                    {getPriorityIcon(task.priority)}
                </div>
            </div>

            {task.description ? (
                <div className="mb-3 max-h-28 overflow-hidden">
                    <div className={TASK_CARD_MARKDOWN_CLASSNAME}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.description}
                        </ReactMarkdown>
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                    archived
                </span>
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onRestore();
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                    Restore
                </button>
            </div>
        </div>
    );
}
