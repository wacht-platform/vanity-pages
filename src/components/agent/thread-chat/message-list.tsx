"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IconSparkles, IconUser } from "@tabler/icons-react";

import type {
    AnswerSubmission,
    ClarificationResponseContent,
    ConversationMessage,
    FileData,
} from "@wacht/types";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import {
    AgentMessageAttachments,
    StructuredConversationContent,
    ThinkingDots,
} from "./message-content";
import {
    threadChatMarkdownComponents,
    threadChatRehypePlugins,
    threadChatRemarkPlugins,
} from "./markdown";
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

function UserMessageMarkdown({ value }: { value: string }) {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:my-0 prose-p:text-sm prose-p:leading-relaxed prose-a:text-primary prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/40 prose-pre:p-0">
            <ReactMarkdown
                remarkPlugins={threadChatRemarkPlugins}
                rehypePlugins={threadChatRehypePlugins}
                components={threadChatMarkdownComponents}
            >
                {value}
            </ReactMarkdown>
        </div>
    );
}

function UserMessageBubble({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-fit max-w-full rounded-2xl rounded-tr-md bg-primary/8 px-4 py-2.5 text-foreground ring-1 ring-inset ring-border/40">
            {children}
        </div>
    );
}

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
    activeClarificationRequestId,
    submittingClarificationRequestId,
    onSubmitClarificationAnswer,
    clarificationResponseByRequestId,
    expiredClarificationRequestIds,
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
    activeClarificationRequestId: string | null;
    submittingClarificationRequestId: string | null;
    onSubmitClarificationAnswer: (
        requestId: string,
        submission: AnswerSubmission,
    ) => Promise<void>;
    clarificationResponseByRequestId: Map<string, ClarificationResponseContent>;
    expiredClarificationRequestIds: Set<string>;
    resolveMessageFileUrl: (file: FileData | null | undefined) => string | null;
    onOpenAttachmentPath: (path: string) => void;
    pendingMessage: string | null;
    pendingFiles: File[] | null;
    isRunning: boolean;
}) {
    const visibleMessages = React.useMemo(
        () =>
            messages.filter((m) => m.content.type !== "clarification_response"),
        [messages],
    );

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
                    {visibleMessages.map((message) => {
                        const messageFiles = getMessageFiles(message.content);
                        const responseAttachments = getResponseAttachments(
                            message.content,
                        );
                        const displayKind = messageDisplayKind(message.content);
                        const eventStyleMessage = isEventStyleMessage(
                            message.content,
                        );
                        const noteMessage = isNoteMessage(message.content);
                        const clarificationResponse =
                            message.content.type === "clarification_request"
                                ? clarificationResponseByRequestId.get(
                                      String(message.id),
                                  )
                                : undefined;
                        const clarificationExpired =
                            message.content.type === "clarification_request" &&
                            !clarificationResponse &&
                            expiredClarificationRequestIds.has(
                                String(message.id),
                            );

                        if (eventStyleMessage && !noteMessage) {
                            return (
                                <div key={message.id} className="py-0.5">
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
                                        activeClarificationRequestId={
                                            activeClarificationRequestId
                                        }
                                        submittingClarificationRequestId={
                                            submittingClarificationRequestId
                                        }
                                        onSubmitClarificationAnswer={
                                            onSubmitClarificationAnswer
                                        }
                                        clarificationResponse={
                                            clarificationResponse
                                        }
                                        clarificationExpired={
                                            clarificationExpired
                                        }
                                    />
                                </div>
                            );
                        }

                        if (displayKind === "user") {
                            return (
                                <div
                                    key={message.id}
                                    className="mt-5 flex justify-end"
                                >
                                    <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-1.5">
                                        <UserMessageBubble>
                                            <UserMessageMarkdown
                                                value={getDisplayContent(
                                                    message.content,
                                                )}
                                            />
                                        </UserMessageBubble>
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <IconUser
                                                size={11}
                                                stroke={1.8}
                                                className="text-muted-foreground"
                                            />
                                            <span>You</span>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span>{formatTime(message.timestamp)}</span>
                                        </div>
                                        {messageFiles.length > 0 ? (
                                            <div className="flex flex-wrap justify-end gap-2">
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
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                                                            >
                                                                {content}
                                                            </a>
                                                        ) : (
                                                            <span
                                                                key={`${file.filename}-${index}`}
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground/60 opacity-60"
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
                                className="mt-5 flex items-start gap-3"
                            >
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <IconSparkles size={14} stroke={1.8} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                                        Agent
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
                                        activeClarificationRequestId={
                                            activeClarificationRequestId
                                        }
                                        submittingClarificationRequestId={
                                            submittingClarificationRequestId
                                        }
                                        onSubmitClarificationAnswer={
                                            onSubmitClarificationAnswer
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
                        <div className="mt-5 flex justify-end opacity-70">
                            <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-1.5">
                                {pendingMessage ? (
                                    <UserMessageBubble>
                                        <UserMessageMarkdown
                                            value={pendingMessage}
                                        />
                                    </UserMessageBubble>
                                ) : null}
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <IconUser
                                        size={11}
                                        stroke={1.8}
                                        className="text-muted-foreground"
                                    />
                                    <span>Sending…</span>
                                </div>
                                {pendingFiles && pendingFiles.length > 0 ? (
                                    <div className="flex flex-wrap justify-end gap-2">
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
