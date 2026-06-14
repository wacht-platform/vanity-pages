"use client";

import * as React from "react";
import { useProjectTaskBoardItemComments } from "@wacht/nextjs";
import type { ProjectTaskBoardItemComment } from "@wacht/types";
import { format, formatDistanceToNow } from "date-fns";
import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconMessageCircle2,
    IconPaperclip,
} from "@tabler/icons-react";

import { Spinner } from "@/components/ui/spinner";
import { TaskFeedbackComposer } from "@/components/agent/task-feedback-composer";

type CommentAttachment = {
    path?: string;
    name?: string;
    original_name?: string;
    mime_type?: string;
    size_bytes?: number;
};

type CommentMetadata = {
    attachments?: CommentAttachment[];
};

export function TaskCommentsPanel({
    projectId,
    taskId,
}: {
    projectId?: string;
    taskId?: string;
}) {
    const { comments, loading, error, createComment } =
        useProjectTaskBoardItemComments(projectId, taskId, !!taskId);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [comments.length]);

    const showEmptyState = !loading && comments.length === 0 && !error;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
                <div className="mx-auto w-full max-w-3xl">
                    {loading && comments.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner size="sm" /> Loading comments…
                        </div>
                    ) : null}
                    {error ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            Failed to load comments.
                        </div>
                    ) : null}
                    {showEmptyState ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/70">
                                <IconMessageCircle2 size={18} stroke={1.5} />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                No feedback yet
                            </p>
                            <p className="max-w-md text-xs text-muted-foreground">
                                Posting a comment preempts the running executor
                                and re-routes the task to the coordinator with
                                the full feedback timeline as context.
                            </p>
                        </div>
                    ) : null}
                    <div className="space-y-2">
                        {comments.map((comment: ProjectTaskBoardItemComment) => (
                            <CommentRow key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="border-t border-border bg-background px-4 py-3 md:px-5">
                <div className="mx-auto w-full max-w-3xl">
                    <TaskFeedbackComposer onSubmit={createComment} />
                </div>
            </div>
        </div>
    );
}

function CommentRow({ comment }: { comment: ProjectTaskBoardItemComment }) {
    const metadata =
        (comment.metadata as CommentMetadata | undefined) ?? undefined;
    const attachments = metadata?.attachments ?? [];
    const resolved = !!comment.resolved_at;
    const [expanded, setExpanded] = React.useState(!resolved);

    if (resolved) {
        return (
            <div className="rounded-md border border-border bg-muted/10 px-3 py-2 transition-colors hover:bg-muted/20">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex w-full items-start gap-2 text-left"
                >
                    {expanded ? (
                        <IconChevronDown
                            size={12}
                            className="mt-1 shrink-0 text-muted-foreground/70"
                        />
                    ) : (
                        <IconChevronRight
                            size={12}
                            className="mt-1 shrink-0 text-muted-foreground/70"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                            <IconCheck
                                size={11}
                                stroke={2}
                                className="text-success"
                            />
                            <span className="font-medium">Resolved</span>
                            <span
                                className="text-muted-foreground/60"
                                title={formatAbsolute(comment.created_at)}
                            >
                                · {formatRelative(comment.created_at)}
                            </span>
                        </div>
                        {comment.resolution_summary ? (
                            <div className="mt-1 text-sm text-foreground/80">
                                {comment.resolution_summary}
                            </div>
                        ) : null}
                    </div>
                </button>
                {expanded ? (
                    <div className="mt-2 border-t border-border pt-2 pl-5">
                        {comment.body ? (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                                {comment.body}
                            </div>
                        ) : null}
                        {attachments.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {attachments.map((a, i) => (
                                    <div
                                        key={`${a.path ?? a.name ?? i}-${i}`}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground/70"
                                    >
                                        <IconPaperclip size={11} stroke={1.5} />
                                        <span className="max-w-52 truncate">
                                            {a.original_name ??
                                                a.name ??
                                                a.path ??
                                                "attachment"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/20">
            <div
                className="mb-1 text-xs text-muted-foreground/70"
                title={formatAbsolute(comment.created_at)}
            >
                {formatRelative(comment.created_at)}
            </div>
            {comment.body ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {comment.body}
                </div>
            ) : null}
            {attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {attachments.map((a, i) => (
                        <div
                            key={`${a.path ?? a.name ?? i}-${i}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground/80"
                        >
                            <IconPaperclip size={11} stroke={1.5} />
                            <span className="max-w-52 truncate">
                                {a.original_name ??
                                    a.name ??
                                    a.path ??
                                    "attachment"}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function formatRelative(iso: string): string {
    try {
        return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
        return iso;
    }
}

function formatAbsolute(iso: string): string {
    try {
        return format(new Date(iso), "PPpp");
    } catch {
        return iso;
    }
}
