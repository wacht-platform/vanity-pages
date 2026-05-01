"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IconFileText, IconFolderOpen } from "@tabler/icons-react";

import type {
  AnswerSubmission,
  ConversationAttachment as ResponseAttachment,
  ConversationContent,
  ExecutionSummaryContent,
} from "@wacht/types";

import { ApprovalRequestCard, ApprovalResponseCard } from "./approval-cards";
import {
  ClarificationRequestCard,
  ClarificationResponseCard,
} from "./clarification-cards";
import { InlineEventRow } from "./event-row";
import {
  threadChatMarkdownComponents,
  threadChatRehypePlugins,
  threadChatRemarkPlugins,
} from "./markdown";
import {
  formatAttachmentLabel,
  getDisplayContent,
  isNoteMessage,
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
      <p className="text-xs text-muted-foreground/55">Attachments</p>
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
              <span className="text-xs text-muted-foreground/55">
                {attachment.type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
      <ToolDetailSection label="Execution details" data={content.agent_execution} />
      <p className="text-xs text-muted-foreground/60">{content.token_count} tokens</p>
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
}) {
  if (isNoteMessage(content)) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 prose-p:text-sm prose-p:leading-relaxed prose-headings:font-semibold prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border/30">
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

  switch (content.type) {
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
        />
      );
    case "clarification_response":
      return <ClarificationResponseCard content={content} />;
    default:
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 prose-p:text-sm prose-p:leading-relaxed prose-headings:font-semibold prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border/30">
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
