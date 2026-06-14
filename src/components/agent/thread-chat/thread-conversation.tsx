"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useAgentThreadConversation } from "@wacht/nextjs";

import { ThreadMessageList } from "./message-list";
import { useThreadApproval } from "./use-thread-approval";
import { useThreadClarification } from "./use-thread-clarification";
import { ChatInput } from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";

/**
 * Self-contained interactive conversation for a single thread: the message
 * timeline plus the full feedback flow (approvals, clarifications, the composer
 * and run state). Works for any thread id — user chats or task execution
 * threads — so it can be embedded wherever a thread's history + feedback is
 * needed (e.g. a task's assignment detail).
 */
export function ThreadConversation({
    threadId,
    boardItemId,
    onOpenAttachmentPath,
    placeholder = "Send feedback…",
    readOnly = false,
}: {
    threadId: string;
    boardItemId?: string;
    onOpenAttachmentPath?: (path: string) => void;
    placeholder?: string;
    /**
     * Trace-only: render the execution timeline without the composer or any
     * inline approval/clarification interactivity. Used for task assignment
     * traces, where feedback goes to the coordinator via a separate composer
     * (the board-item comment mechanism), not the thread-run path.
     */
    readOnly?: boolean;
}) {
    const {
        messages,
        sendMessage,
        submitApprovalResponse,
        cancelExecution,
        isRunning,
        loadMoreMessages,
        hasMoreMessages,
        isLoadingMore,
        messagesLoading,
        pendingMessage,
        pendingFiles,
        pendingApprovalRequest,
        pendingClarificationRequest,
        submitAnswer,
        resolveMessageFileUrl,
    } = useAgentThreadConversation({ threadId, boardItemId });

    const {
        activeApprovalRequestId,
        approvalSelections,
        submittingApprovalRequestId,
        setApprovalChoice,
        submitApprovalRequest,
    } = useThreadApproval({
        messages,
        pendingApprovalRequest,
        submitApprovalResponse,
    });

    const {
        activeClarificationRequestId,
        submittingClarificationRequestId,
        submitClarificationAnswer,
        clarificationResponseByRequestId,
        expiredClarificationRequestIds,
    } = useThreadClarification({
        messages,
        pendingClarificationRequest,
        submitAnswer,
    });

    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
    const handleScroll = React.useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el || isLoadingMore || !hasMoreMessages) return;
        if (el.scrollTop < 80) void loadMoreMessages();
    }, [isLoadingMore, hasMoreMessages, loadMoreMessages]);

    const handleSend = React.useCallback(
        async (text: string, files?: File[]) => {
            await sendMessage(text, files);
        },
        [sendMessage],
    );

    const showInitialLoading = messagesLoading && messages.length === 0;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <ThreadMessageList
                messages={messages}
                showInitialLoading={showInitialLoading}
                isLoadingMore={isLoadingMore}
                scrollContainerRef={scrollContainerRef}
                onScroll={handleScroll}
                activeApprovalRequestId={
                    readOnly ? null : activeApprovalRequestId
                }
                approvalSelections={approvalSelections}
                submittingApprovalRequestId={submittingApprovalRequestId}
                onSetApprovalChoice={setApprovalChoice}
                onSubmitApprovalRequest={submitApprovalRequest}
                activeClarificationRequestId={
                    readOnly ? null : activeClarificationRequestId
                }
                submittingClarificationRequestId={submittingClarificationRequestId}
                onSubmitClarificationAnswer={submitClarificationAnswer}
                clarificationResponseByRequestId={clarificationResponseByRequestId}
                expiredClarificationRequestIds={expiredClarificationRequestIds}
                resolveMessageFileUrl={resolveMessageFileUrl}
                onOpenAttachmentPath={onOpenAttachmentPath ?? (() => {})}
                pendingMessage={pendingMessage}
                pendingFiles={pendingFiles}
                isRunning={isRunning}
            />

            {readOnly ? null : (
            <div className="bg-background px-3 pb-3 pt-2">
                <div className="mx-auto w-full max-w-3xl">
                    {isRunning ? (
                        <div className="mb-2 flex items-center justify-between px-1 py-1">
                            <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-2.5 py-1 text-xs text-warning">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Run in progress</span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => void cancelExecution()}
                            >
                                Stop
                            </Button>
                        </div>
                    ) : null}
                    <ChatInput
                        placeholder={placeholder}
                        onSend={handleSend}
                        isSending={
                            Boolean(pendingMessage) ||
                            Boolean(pendingFiles?.length)
                        }
                    />
                </div>
            </div>
            )}
        </div>
    );
}
