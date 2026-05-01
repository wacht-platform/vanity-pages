"use client";

import React from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextMarkdownInput } from "@/components/agent/rich-text-markdown-input";
import { Spinner } from "@/components/ui/spinner";
import { IconArrowUp, IconPaperclip, IconX } from "@tabler/icons-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type FileData = {
    filename: string;
    mime_type: string;
    file: File;
};

interface ChatInputProps {
    placeholder?: string;
    className?: string;
    onSend?: (message: string, files?: File[]) => Promise<void> | void;
    isSending?: boolean;
    disabled?: boolean;
    agentOptions?: Array<{
        value: string;
        label: string;
    }>;
    selectedAgentId?: string;
    onSelectedAgentIdChange?: (agentId: string) => void;
}

export function ChatInput({
    placeholder = "Reply…",
    className,
    onSend,
    isSending = false,
    disabled = false,
    agentOptions,
    selectedAgentId,
    onSelectedAgentIdChange,
}: ChatInputProps) {
    const [message, setMessage] = React.useState("");
    const [selectedFiles, setSelectedFiles] = React.useState<FileData[]>([]);
    const [isFocused, setIsFocused] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const isBusy = isSending || disabled;

    const handleSend = async () => {
        const trimmedMessage = message.trim();
        if (
            !(trimmedMessage || selectedFiles.length > 0) ||
            !onSend ||
            isBusy
        ) {
            return;
        }

        const filesToSend = selectedFiles.map((f) => f.file);
        setMessage("");
        setSelectedFiles([]);

        await Promise.resolve(onSend(trimmedMessage, filesToSend));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newFiles: FileData[] = files.map((file) => ({
                filename: file.name,
                mime_type: file.type || "application/octet-stream",
                file: file,
            }));

            if (!isBusy) {
                setSelectedFiles((prev) => [...prev, ...newFiles]);
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const canSend = (message.trim() || selectedFiles.length > 0) && !isBusy;
    const showAgentSelector = Boolean(agentOptions && agentOptions.length > 0);

    return (
        <div
            className={cn(
                "relative w-full rounded-xl border bg-background transition-colors",
                isFocused
                    ? "border-border shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    : "border-border/60",
                isBusy && "opacity-80",
                className,
            )}
        >
            {selectedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 pt-3">
                    {selectedFiles.map((file, i) => (
                        <div
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-1 text-sm text-foreground/80"
                        >
                            <span className="max-w-40 truncate">
                                {file.filename}
                            </span>
                            <button
                                onClick={() => removeFile(i)}
                                disabled={isBusy}
                                className="text-muted-foreground/60 transition-colors hover:text-foreground"
                                aria-label={`Remove ${file.filename}`}
                            >
                                <IconX size={11} stroke={2} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                onFocusCapture={() => setIsFocused(true)}
                onBlurCapture={() => setIsFocused(false)}
            >
                <RichTextMarkdownInput
                    value={message}
                    onChange={setMessage}
                    disabled={isBusy}
                    onSubmit={() => void handleSend()}
                    showToolbar={isFocused || Boolean(message)}
                    className="max-h-[180px] min-h-11 overflow-y-auto px-3 pb-2 pt-3 text-sm leading-6 text-foreground"
                    contentClassName={cn(
                        "text-sm leading-6 text-foreground",
                        "prose-p:min-h-6 prose-a:text-primary prose-code:text-[0.9em]",
                        "placeholder:text-muted-foreground/50",
                        isBusy && "cursor-not-allowed",
                    )}
                    placeholder={placeholder}
                />
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileSelect}
            />

            <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1.5">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                        title="Attach files"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground disabled:opacity-40"
                    >
                        <IconPaperclip size={15} stroke={1.8} />
                    </button>
                    {selectedFiles.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                            {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {showAgentSelector ? (
                        <Select
                            value={selectedAgentId}
                            onValueChange={onSelectedAgentIdChange}
                            disabled={isBusy}
                        >
                            <SelectTrigger
                                size="sm"
                                className="h-8 w-auto min-w-0 max-w-[200px] gap-1.5 rounded-full border-border/50 bg-accent/35 px-2.5 text-sm text-muted-foreground shadow-none hover:bg-accent/50"
                            >
                                <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                                <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {agentOptions?.map((agent) => (
                                    <SelectItem key={agent.value} value={agent.value}>
                                        {agent.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : null}

                    <button
                        onClick={() => void handleSend()}
                        disabled={!canSend}
                        className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                            canSend
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted/60 text-muted-foreground/35 cursor-not-allowed",
                        )}
                    >
                        {isBusy ? (
                            <Spinner
                                size="sm"
                                className="h-3.5 w-3.5 border-primary-foreground/30 border-t-primary-foreground"
                            />
                        ) : (
                            <IconArrowUp size={14} stroke={2.2} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
