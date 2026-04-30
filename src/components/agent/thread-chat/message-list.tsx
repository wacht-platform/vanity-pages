"use client";

import * as React from "react";
import { IconSparkles } from "@tabler/icons-react";

import type { ConversationMessage, FileData } from "@wacht/types";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import {
    AgentMessageAttachments,
    StructuredConversationContent,
    ThinkingDots,
} from "./message-content";
import {
    formatFileSize,
    formatTime,
    getDisplayContent,
    getMessageFiles,
    getResponseAttachments,
    isEventStyleMessage,
    isNoteMessage,
    messageDisplayKind,
    type ApprovalChoice,
} from "./shared";

export function ThreadMessageList({
    messages,
    showInitialLoading,
    isLoadingMore,
    scrollContainerRef,
    onScroll,
    activeApprovalRequestId,
    approvalSelections,
    submittingApprovalRequestId,
    onSetApprovalChoice,
    onSubmitApprovalRequest,
    resolveMessageFileUrl,
    onOpenAttachmentPath,
    pendingMessage,
    pendingFiles,
    isRunning,
}: {
    messages: ConversationMessage[];
    showInitialLoading: boolean;
    isLoadingMore: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    activeApprovalRequestId: string | null;
    approvalSelections: Record<string, Record<string, ApprovalChoice>>;
    submittingApprovalRequestId: string | null;
    onSetApprovalChoice: (
        requestId: string,
        toolName: string,
        choice: ApprovalChoice,
        submitImmediately?: boolean,
    ) => void;
    onSubmitApprovalRequest: (requestId: string) => Promise<void>;
    resolveMessageFileUrl: (file: FileData | null | undefined) => string | null;
    onOpenAttachmentPath: (path: string) => void;
    pendingMessage: string | null;
    pendingFiles: File[] | null;
    isRunning: boolean;
}) {
    return (
        <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto"
            onScroll={onScroll}
        >
            {isLoadingMore ? (
                <div className="flex justify-center py-3">
                    <Spinner size="sm" />
                </div>
            ) : null}

            <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-2">
                {showInitialLoading ? (
                    <div className="space-y-6 py-4">
                        {[...Array(3)].map((_, index) => (
                            <div
                                key={`chat-skeleton-${index}`}
                                className={cn(
                                    "flex gap-3",
                                    index % 2 === 0
                                        ? "justify-start"
                                        : "justify-end",
                                )}
                            >
                                {index % 2 === 0 ? (
                                    <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
                                ) : null}
                                <div
                                    className={cn(
                                        "max-w-[75%] space-y-2",
                                        index % 2 !== 0 &&
                                            "flex flex-col items-end",
                                    )}
                                >
                                    <Skeleton className="h-4 w-52 rounded-lg" />
                                    <Skeleton className="h-4 w-36 rounded-lg" />
                                    <Skeleton className="h-3 w-16 rounded-lg" />
                                </div>
                                {index % 2 !== 0 ? (
                                    <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="space-y-2">
                    {messages.map((message) => {
                        const messageFiles = getMessageFiles(message.content);
                        const responseAttachments = getResponseAttachments(
                            message.content,
                        );
                        const displayKind = messageDisplayKind(message.content);
                        const eventStyleMessage = isEventStyleMessage(
                            message.content,
                        );
                        const noteMessage = isNoteMessage(
                            message.content,
                        );

                        if (eventStyleMessage && !noteMessage) {
                            return (
                                <div key={message.id} className="px-3 py-0.5">
                                    <StructuredConversationContent
                                        content={message.content}
                                        messageId={String(message.id)}
                                        activeApprovalRequestId={
                                            activeApprovalRequestId
                                        }
                                        approvalSelections={approvalSelections}
                                        submittingApprovalRequestId={
                                            submittingApprovalRequestId
                                        }
                                        onSetApprovalChoice={
                                            onSetApprovalChoice
                                        }
                                        onSubmitApprovalRequest={
                                            onSubmitApprovalRequest
                                        }
                                    />
                                </div>
                            );
                        }

                        if (displayKind === "user") {
                            return (
                                <div
                                    key={message.id}
                                    className="mt-4 flex justify-end"
                                >
                                    <div className="flex max-w-[80%] flex-col items-end gap-1">
                                        <div className="rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground">
                                            {getDisplayContent(message.content)}
                                        </div>
                                        <span className="text-xs text-muted-foreground/50">
                                            {formatTime(message.timestamp)}
                                        </span>
                                        {messageFiles.length > 0 ? (
                                            <div className="flex w-full flex-wrap justify-end gap-2">
                                                {messageFiles.map(
                                                    (file, index) => {
                                                        const fileUrl =
                                                            resolveMessageFileUrl(
                                                                file,
                                                            );
                                                        const content = (
                                                            <>
                                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                                                <span className="max-w-52 truncate">
                                                                    {
                                                                        file.filename
                                                                    }
                                                                </span>
                                                                <span className="hidden text-muted-foreground/60 group-hover:inline">
                                                                    {file.size_bytes
                                                                        ? formatFileSize(
                                                                              file.size_bytes,
                                                                          )
                                                                        : "Download"}
                                                                </span>
                                                            </>
                                                        );

                                                        return fileUrl ? (
                                                            <a
                                                                key={`${file.filename}-${index}`}
                                                                href={fileUrl}
                                                                download={
                                                                    file.filename
                                                                }
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                                                            >
                                                                {content}
                                                            </a>
                                                        ) : (
                                                            <span
                                                                key={`${file.filename}-${index}`}
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs text-foreground/60 opacity-60"
                                                            >
                                                                {content}
                                                            </span>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={message.id}
                                className="mt-4 flex items-start gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <IconSparkles
                                                size={12}
                                                stroke={1.8}
                                                className="text-muted-foreground/70"
                                            />
                                            Agent
                                        </span>
                                    </div>
                                    <StructuredConversationContent
                                        content={message.content}
                                        messageId={String(message.id)}
                                        activeApprovalRequestId={
                                            activeApprovalRequestId
                                        }
                                        approvalSelections={approvalSelections}
                                        submittingApprovalRequestId={
                                            submittingApprovalRequestId
                                        }
                                        onSetApprovalChoice={
                                            onSetApprovalChoice
                                        }
                                        onSubmitApprovalRequest={
                                            onSubmitApprovalRequest
                                        }
                                    />
                                    <AgentMessageAttachments
                                        attachments={responseAttachments}
                                        onOpenAttachment={(attachment) =>
                                            onOpenAttachmentPath(
                                                attachment.type === "folder"
                                                    ? `${attachment.path}/`
                                                    : attachment.path,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {pendingMessage ||
                    (pendingFiles && pendingFiles.length > 0) ? (
                        <div className="mt-4 flex justify-end">
                            <div className="flex max-w-[80%] flex-col items-end gap-1">
                                {pendingMessage ? (
                                    <div className="rounded-md border border-border/30 bg-muted/20 px-3 py-2 text-sm leading-relaxed text-foreground/70">
                                        {pendingMessage}
                                    </div>
                                ) : null}
                                {pendingFiles && pendingFiles.length > 0 ? (
                                    <div className="flex w-full flex-wrap justify-end gap-2">
                                        {pendingFiles.map((file, index) => (
                                            <div
                                                key={`${file.name}-${file.size}-${index}`}
                                                className="inline-flex items-center gap-2 rounded-md border border-border/25 bg-background px-2 py-1.5 text-xs text-foreground/60"
                                            >
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                                                <span className="max-w-52 truncate">
                                                    {file.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {isRunning &&
                    !pendingMessage &&
                    !(pendingFiles && pendingFiles.length > 0) ? (
                        <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                            <ThinkingDots />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
