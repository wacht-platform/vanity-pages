"use client";

import * as React from "react";
import { useProjectTaskBoardItemComments } from "@wacht/nextjs";
import type { ProjectTaskBoardItemComment } from "@wacht/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { IconPaperclip, IconX } from "@tabler/icons-react";

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
    disabled,
}: {
    projectId?: string;
    taskId?: string;
    disabled?: boolean;
}) {
    const { comments, loading, error, createComment } =
        useProjectTaskBoardItemComments(projectId, taskId, !!taskId);
    const [draft, setDraft] = React.useState("");
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

    const showEmptyState =
        !loading && comments.length === 0 && !error;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
                <div className="mx-auto w-full max-w-3xl space-y-3">
                    {loading && comments.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner size="sm" /> Loading comments…
                        </div>
                    ) : null}
                    {error ? (
                        <div className="text-sm text-destructive">
                            Failed to load comments.
                        </div>
                    ) : null}
                    {showEmptyState ? (
                        <p className="text-sm italic text-muted-foreground">
                            No feedback yet. Posting a comment preempts the running
                            executor and re-routes the task to the coordinator.
                        </p>
                    ) : null}
                    {comments.map((comment: ProjectTaskBoardItemComment) => {
                        const metadata =
                            (comment.metadata as CommentMetadata | undefined) ??
                            undefined;
                        const attachments = metadata?.attachments ?? [];
                        return (
                            <div
                                key={comment.id}
                                className="rounded-md border border-border/50 bg-muted/20 p-3"
                            >
                                <div className="mb-1 text-xs text-muted-foreground">
                                    {formatTimestamp(comment.created_at)}
                                </div>
                                {comment.body ? (
                                    <div className="whitespace-pre-wrap text-sm text-foreground">
                                        {comment.body}
                                    </div>
                                ) : null}
                                {attachments.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {attachments.map((a, i) => (
                                            <div
                                                key={`${a.path ?? a.name ?? i}-${i}`}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-background px-2 py-1 text-xs"
                                            >
                                                <IconPaperclip
                                                    size={12}
                                                    stroke={1.5}
                                                />
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
                    })}
                </div>
            </div>
            <div className="border-t border-border/50 bg-background px-4 py-3 md:px-5">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                    <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={
                            disabled
                                ? "Comments are disabled for this task."
                                : "Leave feedback. The agent will see it immediately and re-route."
                        }
                        disabled={disabled || submitting}
                        rows={3}
                        className="resize-none"
                    />
                    {pendingFiles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {pendingFiles.map((file, i) => (
                                <div
                                    key={`${file.name}-${file.size}-${i}`}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-xs"
                                >
                                    <IconPaperclip size={12} stroke={1.5} />
                                    <span className="max-w-52 truncate">
                                        {file.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removePendingFile(i)}
                                        disabled={submitting}
                                        className="text-muted-foreground hover:text-foreground"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <IconX size={12} stroke={2} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFilesSelected}
                            disabled={disabled || submitting}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={disabled || submitting}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <IconPaperclip size={14} stroke={1.5} />
                            Attach
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                disabled ||
                                submitting ||
                                (!draft.trim() && pendingFiles.length === 0)
                            }
                            onClick={handleSubmit}
                        >
                            {submitting ? "Posting…" : "Post"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTimestamp(iso: string): string {
    try {
        return format(new Date(iso), "PPpp");
    } catch {
        return iso;
    }
}
