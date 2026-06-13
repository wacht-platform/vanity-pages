"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IconRobot, IconUser } from "@tabler/icons-react";

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
    messageDisplayKind,
    type ApprovalChoice,
} from "./shared";

function UserMessageMarkdown({ value }: { value: string }) {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:my-0 prose-p:text-sm prose-p:leading-relaxed prose-a:text-primary prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/40 prose-pre:p-0">
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

    // Group consecutive non-user messages into a single agent "turn" so the
    // tool-call cards render as one connected timeline (frame 12), instead of
    // loose disconnected cards. User messages break the run.
    type MessageGroup =
        | { kind: "user"; message: ConversationMessage }
        | { kind: "agent"; messages: ConversationMessage[] };
    const groups = React.useMemo<MessageGroup[]>(() => {
        const out: MessageGroup[] = [];
        for (const message of visibleMessages) {
            if (messageDisplayKind(message.content) === "user") {
                out.push({ kind: "user", message });
                continue;
            }
            const last = out[out.length - 1];
            if (last && last.kind === "agent") {
                last.messages.push(message);
            } else {
                out.push({ kind: "agent", messages: [message] });
            }
        }
        return out;
    }, [visibleMessages]);

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
                    {groups.map((group) => {
                        if (group.kind === "user") {
                            const message = group.message;
                            const messageFiles = getMessageFiles(
                                message.content,
                            );
                            return (
                                <div
                                    key={message.id}
                                    className="mt-5 flex items-start gap-[11px]"
                                >
                                    <span className="grid size-[26px] flex-none place-items-center rounded-[7px] bg-primary/10 text-[11px] font-medium text-primary">
                                        <IconUser size={13} stroke={1.8} />
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <div className="text-[13.5px] leading-[1.5] text-foreground">
                                            <UserMessageMarkdown
                                                value={getDisplayContent(
                                                    message.content,
                                                )}
                                            />
                                        </div>
                                        <div className="font-mono text-[11px] text-faint">
                                            You · {formatTime(message.timestamp)}
                                        </div>
                                        {messageFiles.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
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
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                                                            >
                                                                {content}
                                                            </a>
                                                        ) : (
                                                            <span
                                                                key={`${file.filename}-${index}`}
                                                                className="group inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground/60 opacity-60"
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

                        const first = group.messages[0];
                        return (
                            <div
                                key={`agent-${first.id}`}
                                className="mt-5 flex items-start gap-[11px]"
                            >
                                <span className="mt-0.5 grid size-[26px] flex-none place-items-center rounded-[7px] bg-secondary text-foreground-secondary">
                                    <IconRobot size={14} stroke={1.8} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-foreground">
                                            Agent
                                        </span>
                                        <span className="font-mono text-[11px] text-faint">
                                            {formatTime(first.timestamp)}
                                        </span>
                                    </div>
                                    {/* connected execution timeline (frame 12 .trace) */}
                                    <div className="flex flex-col pt-0.5">
                                        {group.messages.map((message) => {
                                            const responseAttachments =
                                                getResponseAttachments(
                                                    message.content,
                                                );
                                            const clarificationResponse =
                                                message.content.type ===
                                                "clarification_request"
                                                    ? clarificationResponseByRequestId.get(
                                                          String(message.id),
                                                      )
                                                    : undefined;
                                            const clarificationExpired =
                                                message.content.type ===
                                                    "clarification_request" &&
                                                !clarificationResponse &&
                                                expiredClarificationRequestIds.has(
                                                    String(message.id),
                                                );
                                            return (
                                                <React.Fragment
                                                    key={message.id}
                                                >
                                                    <StructuredConversationContent
                                                        content={
                                                            message.content
                                                        }
                                                        messageId={String(
                                                            message.id,
                                                        )}
                                                        activeApprovalRequestId={
                                                            activeApprovalRequestId
                                                        }
                                                        approvalSelections={
                                                            approvalSelections
                                                        }
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
                                                    <AgentMessageAttachments
                                                        attachments={
                                                            responseAttachments
                                                        }
                                                        onOpenAttachment={(
                                                            attachment,
                                                        ) =>
                                                            onOpenAttachmentPath(
                                                                attachment.type ===
                                                                    "folder"
                                                                    ? `${attachment.path}/`
                                                                    : attachment.path,
                                                            )
                                                        }
                                                    />
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {pendingMessage ||
                    (pendingFiles && pendingFiles.length > 0) ? (
                        <div className="mt-5 flex items-start gap-[11px] opacity-70">
                            <span className="grid size-[26px] flex-none place-items-center rounded-[7px] bg-primary/10 text-[11px] font-medium text-primary">
                                <IconUser size={13} stroke={1.8} />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                {pendingMessage ? (
                                    <div className="text-[13.5px] leading-[1.5] text-foreground">
                                        <UserMessageMarkdown
                                            value={pendingMessage}
                                        />
                                    </div>
                                ) : null}
                                <div className="font-mono text-[11px] text-faint">
                                    Sending…
                                </div>
                                {pendingFiles && pendingFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {pendingFiles.map((file, index) => (
                                            <div
                                                key={`${file.name}-${file.size}-${index}`}
                                                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground/60"
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
