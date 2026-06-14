"use client";

import * as React from "react";
import { toast } from "sonner";
import { IconPaperclip, IconSend, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Presentational composer for task feedback. Feedback always routes to the
 * coordinator (preempting any live executor and re-routing the task) via the
 * board-item comment mechanism — deliberately separate from the thread-run
 * (sendMessage) path used by the user-facing agent chat. Callers own the
 * mechanism by passing `onSubmit` (e.g. `createComment` from
 * `useProjectTaskBoardItemComments`).
 */
export function TaskFeedbackComposer({
    onSubmit,
    placeholder = "Leave feedback. The agent will see it immediately and re-route.",
    disabled = false,
}: {
    onSubmit: (body: string, files?: File[]) => Promise<unknown>;
    placeholder?: string;
    disabled?: boolean;
}) {
    const [draft, setDraft] = React.useState("");
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleSubmit = React.useCallback(async () => {
        const body = draft.trim();
        if (!body && pendingFiles.length === 0) return;
        setSubmitting(true);
        try {
            await onSubmit(body, pendingFiles);
            setDraft("");
            setPendingFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            toast.error("Failed to send feedback", {
                description:
                    err instanceof Error ? err.message : "Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    }, [onSubmit, draft, pendingFiles]);

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

    const isDisabled = disabled || submitting;

    return (
        <div className="rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-border/40">
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isDisabled}
                rows={2}
                className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            {pendingFiles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                    {pendingFiles.map((file, i) => (
                        <div
                            key={`${file.name}-${file.size}-${i}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-xs"
                        >
                            <IconPaperclip size={11} stroke={1.5} />
                            <span className="max-w-52 truncate">
                                {file.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => removePendingFile(i)}
                                disabled={isDisabled}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={`Remove ${file.name}`}
                            >
                                <IconX size={11} stroke={2} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                    disabled={isDisabled}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDisabled}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Attach files"
                >
                    <IconPaperclip size={13} stroke={1.5} />
                    Attach
                </button>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                    <span className="hidden sm:inline">⌘ + Enter to send</span>
                    <Button
                        type="button"
                        size="sm"
                        disabled={
                            isDisabled ||
                            (!draft.trim() && pendingFiles.length === 0)
                        }
                        onClick={handleSubmit}
                        className="h-7 gap-1.5 px-3 text-xs"
                    >
                        <IconSend size={12} stroke={1.5} />
                        {submitting ? "Sending…" : "Send"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
