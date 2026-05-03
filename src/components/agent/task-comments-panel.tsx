"use client";

import * as React from "react";
import { useProjectTaskBoardItemComments } from "@wacht/nextjs";
import type { ProjectTaskBoardItemComment } from "@wacht/types";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconMessageCircle2,
    IconPaperclip,
    IconSend,
    IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

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
    const [draft, setDraft] = React.useState("");
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [comments.length]);

    const handleSubmit = React.useCallback(async () => {
        const body = draft.trim();
        if (!body && pendingFiles.length === 0) return;
        setSubmitting(true);
        try {
            await createComment(body, pendingFiles);
            setDraft("");
            setPendingFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            toast.error("Failed to post comment", {
                description:
                    err instanceof Error ? err.message : "Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    }, [createComment, draft, pendingFiles]);

    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSubmit();
            }
        },
        [handleSubmit],
    );

    const handleFilesSelected = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) return;
            setPendingFiles((prev) => [...prev, ...files]);
            if (event.target) event.target.value = "";
        },
        [],
    );

    const removePendingFile = React.useCallback((index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

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
            <div className="border-t border-border/50 bg-background px-4 py-3 md:px-5">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="rounded-lg border border-border/50 bg-background focus-within:border-border focus-within:ring-1 focus-within:ring-border/40">
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Leave feedback. The agent will see it immediately and re-route."
                            disabled={submitting}
                            rows={2}
                            className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                        {pendingFiles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 border-t border-border/40 px-3 py-2">
                                {pendingFiles.map((file, i) => (
                                    <div
                                        key={`${file.name}-${file.size}-${i}`}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-xs"
                                    >
                                        <IconPaperclip
                                            size={11}
                                            stroke={1.5}
                                        />
                                        <span className="max-w-52 truncate">
                                            {file.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removePendingFile(i)}
                                            disabled={submitting}
                                            className="text-muted-foreground transition-colors hover:text-foreground"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <IconX size={11} stroke={2} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-2 border-t border-border/40 px-2 py-1.5">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFilesSelected}
                                disabled={submitting}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitting}
                                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Attach files"
                            >
                                <IconPaperclip size={13} stroke={1.5} />
                                Attach
                            </button>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                                <span className="hidden sm:inline">
                                    ⌘ + Enter to post
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                        submitting ||
                                        (!draft.trim() &&
                                            pendingFiles.length === 0)
                                    }
                                    onClick={handleSubmit}
                                    className="h-7 gap-1.5 px-3 text-xs"
                                >
                                    <IconSend size={12} stroke={1.5} />
                                    {submitting ? "Posting…" : "Post"}
                                </Button>
                            </div>
                        </div>
                    </div>
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
            <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2 transition-colors hover:bg-muted/20">
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
                                className="text-emerald-600 dark:text-emerald-400"
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
                    <div className="mt-2 border-t border-border/30 pt-2 pl-5">
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
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-xs text-foreground/70"
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
        <div className="rounded-md border border-border/40 bg-background px-3 py-2.5 transition-colors hover:bg-muted/20">
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
                            className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-xs text-foreground/80"
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
