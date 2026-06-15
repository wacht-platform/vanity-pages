"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
    IconArrowsExchange,
    IconBell,
    IconFile,
    IconFileText,
    IconFolderOpen,
    IconInbox,
    IconPlayerPlay,
    IconRoute,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import type {
    AnswerSubmission,
    ClarificationResponseContent,
    ConversationAttachment as ResponseAttachment,
    ConversationContent,
    ExecutionSummaryContent,
    TaskHandoffArtifact,
    TaskHandoffReceivedContent,
} from "@wacht/types";

import { ApprovalRequestCard, ApprovalResponseCard } from "./approval-cards";
import { ClarificationRequestCard } from "./clarification-cards";
import { InlineEventRow } from "./event-row";
import {
    threadChatMarkdownComponents,
    threadChatRehypePlugins,
    threadChatRemarkPlugins,
} from "./markdown";
import {
    formatAttachmentLabel,
    formatTime,
    getDisplayContent,
    type ApprovalChoice,
} from "./shared";
import { ToolDetailSection } from "./structured-value";
import {
    SystemDecisionEventCard,
    ToolResultEventCard,
} from "./tool-event-cards";

export { getStatusIndicator } from "./event-row";

export function AgentMessageAttachments({
    attachments,
    onOpenAttachment,
}: {
    attachments: ResponseAttachment[];
    onOpenAttachment: (attachment: ResponseAttachment) => void;
}) {
    if (attachments.length === 0) return null;

    return (
        <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Attachments</p>
            <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => {
                    const isFolder = attachment.type === "folder";
                    const label = formatAttachmentLabel(attachment.path);

                    return (
                        <button
                            type="button"
                            key={`${attachment.path}-${index}`}
                            className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-accent/30 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/50"
                            title={attachment.path}
                            onClick={() => onOpenAttachment(attachment)}
                        >
                            {isFolder ? (
                                <IconFolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/65" />
                            ) : (
                                <IconFileText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                            )}
                            <span className="max-w-56 truncate">{label}</span>
                            <span className="text-xs text-muted-foreground">
                                {attachment.type}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function formatLabel(value?: string) {
    if (!value) return "";
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function coerceList(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [value];
        }
    }
    return [];
}

function asText(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
        const o = value as Record<string, unknown>;
        return String(
            o.text ?? o.message ?? o.note ?? o.action ?? JSON.stringify(value),
        );
    }
    return String(value);
}

function TaskHandoffEvent({
    content,
    onOpenAttachmentPath,
}: {
    content: TaskHandoffReceivedContent;
    onOpenAttachmentPath?: (path: string) => void;
}) {
    const artifacts = coerceList(content.artifacts) as TaskHandoffArtifact[];
    const blockers = coerceList(content.blockers);
    const nextActions = coerceList(content.next_actions);
    const node =
        content.outcome === "completed"
            ? "ok"
            : content.outcome === "failed"
              ? "err"
              : "idle";
    return (
        <InlineEventRow
            icon={<IconArrowsExchange className="h-3.5 w-3.5" />}
            title={`Handoff from ${formatLabel(content.source_role)}`}
            node={node}
            defaultOpen
            meta={
                <span className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            "font-medium",
                            node === "ok"
                                ? "text-success"
                                : node === "err"
                                  ? "text-error"
                                  : "text-muted-foreground",
                        )}
                    >
                        {content.outcome}
                    </span>
                    {content.completed_at ? (
                        <span className="text-faint">
                            · {formatTime(content.completed_at)}
                        </span>
                    ) : null}
                </span>
            }
        >
            <div className="space-y-3 pt-1">
                {content.summary ? (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                        {content.summary}
                    </p>
                ) : null}
                {artifacts.length > 0 ? (
                    <div>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
                            Artifacts
                        </div>
                        <ul className="space-y-1">
                            {artifacts.map((a, i) => (
                                <li key={a.path ?? i} className="text-[12px]">
                                    <button
                                        type="button"
                                        disabled={!a.path}
                                        onClick={() =>
                                            a.path &&
                                            onOpenAttachmentPath?.(a.path)
                                        }
                                        className="inline-flex items-center gap-1.5 text-foreground/90 underline-offset-2 hover:underline disabled:no-underline"
                                    >
                                        <IconFile className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="font-mono">
                                            {a.path ?? "artifact"}
                                        </span>
                                    </button>
                                    {a.note ? (
                                        <span className="ml-1 text-muted-foreground">
                                            — {a.note}
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {nextActions.length > 0 ? (
                    <div>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
                            Next actions
                        </div>
                        <ul className="space-y-1">
                            {nextActions.map((n, i) => (
                                <li
                                    key={i}
                                    className="flex gap-1.5 text-[12px] text-foreground/80"
                                >
                                    <span className="text-faint">→</span>
                                    <span>{asText(n)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {blockers.length > 0 ? (
                    <div>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.06em] text-error/80">
                            Blockers
                        </div>
                        <ul className="space-y-1">
                            {blockers.map((b, i) => (
                                <li
                                    key={i}
                                    className="text-[12px] text-error"
                                >
                                    {asText(b)}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </InlineEventRow>
    );
}

function ExecutionSummaryCard({
    content,
}: {
    content: ExecutionSummaryContent;
}) {
    return (
        <InlineEventRow
            icon={<IconFileText className="h-3.5 w-3.5" />}
            title="Execution summary"
        >
            <p className="text-sm leading-6 text-foreground/75">
                {content.user_message}
            </p>
            <ToolDetailSection
                label="Execution details"
                data={content.agent_execution}
            />
            <p className="text-xs text-muted-foreground/60">
                {content.token_count} tokens
            </p>
        </InlineEventRow>
    );
}

export function StructuredConversationContent({
    content,
    messageId,
    activeApprovalRequestId,
    approvalSelections,
    submittingApprovalRequestId,
    onSetApprovalChoice,
    onSubmitApprovalRequest,
    activeClarificationRequestId,
    submittingClarificationRequestId,
    onSubmitClarificationAnswer,
    clarificationResponse,
    clarificationExpired,
    onOpenAttachmentPath,
}: {
    content: ConversationContent;
    messageId: string;
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
    clarificationResponse?: ClarificationResponseContent;
    clarificationExpired?: boolean;
    onOpenAttachmentPath?: (path: string) => void;
}) {
    switch (content.type) {
        case "task_handoff_received":
            return (
                <TaskHandoffEvent
                    content={content}
                    onOpenAttachmentPath={onOpenAttachmentPath}
                />
            );
        case "task_subscription_notification":
            return (
                <InlineEventRow
                    icon={<IconBell className="h-3.5 w-3.5" />}
                    title={`Task ${content.task_key}: ${formatLabel(content.from_status)} → ${formatLabel(content.to_status)}`}
                    meta={
                        content.transitioned_at
                            ? formatTime(content.transitioned_at)
                            : undefined
                    }
                />
            );
        case "task_subscription_delivery":
            return (
                <InlineEventRow
                    icon={<IconInbox className="h-3.5 w-3.5" />}
                    title={content.summary || "Subscription update"}
                />
            );
        case "assignment_execution_trigger":
            return (
                <InlineEventRow
                    icon={<IconPlayerPlay className="h-3.5 w-3.5" />}
                    title={`Started executing ${content.task_key}`}
                    meta={content.routing_reason}
                />
            );
        case "task_routing_trigger":
            return (
                <InlineEventRow
                    icon={<IconRoute className="h-3.5 w-3.5" />}
                    title={`Routed for decision · ${content.task_key}`}
                    meta={content.routing_reason}
                />
            );
        case "approval_request":
            return (
                <ApprovalRequestCard
                    content={content}
                    requestId={messageId}
                    isActive={activeApprovalRequestId === messageId}
                    selections={approvalSelections[messageId] ?? {}}
                    submitting={submittingApprovalRequestId === messageId}
                    onSetToolChoice={onSetApprovalChoice}
                    onSubmit={onSubmitApprovalRequest}
                />
            );
        case "approval_response":
            return <ApprovalResponseCard content={content} />;
        case "system_decision":
            return <SystemDecisionEventCard content={content} />;
        case "tool_result":
            return <ToolResultEventCard content={content} />;
        case "execution_summary":
            return <ExecutionSummaryCard content={content} />;
        case "clarification_request":
            return (
                <ClarificationRequestCard
                    content={content}
                    isActive={activeClarificationRequestId === messageId}
                    submitting={submittingClarificationRequestId === messageId}
                    onSubmit={(submission) =>
                        onSubmitClarificationAnswer(messageId, submission)
                    }
                    response={clarificationResponse}
                    expired={clarificationExpired}
                />
            );
        case "clarification_response":
            return null;
        default:
            return (
                <div className="prose prose-sm dark:prose-invert my-3 max-w-none text-foreground/90 first:mt-0 last:mb-0 prose-p:text-sm prose-p:leading-relaxed prose-headings:font-semibold prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border">
                    <ReactMarkdown
                        remarkPlugins={threadChatRemarkPlugins}
                        rehypePlugins={threadChatRehypePlugins}
                        components={threadChatMarkdownComponents}
                    >
                        {getDisplayContent(content)}
                    </ReactMarkdown>
                </div>
            );
    }
}

export function ThinkingDots() {
    return (
        <div className="flex items-center gap-1 px-1 py-2">
            {[0, 150, 300].map((delay) => (
                <span
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                    style={{
                        animationDelay: `${delay}ms`,
                        animationDuration: "1.1s",
                    }}
                />
            ))}
        </div>
    );
}
