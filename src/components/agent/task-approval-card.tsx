"use client";

import * as React from "react";
import type {
  ApprovalRequestContent,
  ThreadPendingApprovalRequestState,
  ToolApprovalDecision,
} from "@wacht/types";

import { ApprovalRequestCard } from "@/components/agent/thread-chat/approval-cards";
import type { ApprovalChoice } from "@/components/agent/thread-chat/shared";

interface TaskApprovalCardProps {
  pending: ThreadPendingApprovalRequestState;
  onSubmit: (approvals: ToolApprovalDecision[]) => Promise<boolean>;
}

export function TaskApprovalCard({ pending, onSubmit }: TaskApprovalCardProps) {
  const requestId = pending.request_message_id ?? "pending";
  const [selections, setSelections] = React.useState<Record<string, ApprovalChoice>>(
    () =>
      Object.fromEntries(
        pending.tools.map((tool) => [tool.tool_name, "deny" as ApprovalChoice]),
      ),
  );
  const [submitting, setSubmitting] = React.useState(false);

  const submit = React.useCallback(
    async (currentSelections: Record<string, ApprovalChoice>) => {
      if (submitting) return;
      setSubmitting(true);
      const approvals: ToolApprovalDecision[] = Object.entries(currentSelections)
        .filter(([, choice]) => choice !== "deny")
        .map(([tool_name, choice]) => ({
          tool_name,
          mode: choice as ToolApprovalDecision["mode"],
        }));
      const ok = await onSubmit(approvals);
      if (!ok) setSubmitting(false);
    },
    [submitting, onSubmit],
  );

  const setToolChoice = React.useCallback(
    (
      _requestId: string,
      toolName: string,
      choice: ApprovalChoice,
      submitImmediately?: boolean,
    ) => {
      setSelections((current) => {
        const next = { ...current, [toolName]: choice };
        if (submitImmediately) {
          void submit(next);
        }
        return next;
      });
    },
    [submit],
  );

  const content: ApprovalRequestContent = {
    type: "approval_request",
    description: pending.description,
    tools: pending.tools.map((tool) => ({
      tool_id: tool.tool_id,
      tool_name: tool.tool_name,
      tool_description: tool.tool_description,
    })),
  };

  return (
    <ApprovalRequestCard
      content={content}
      requestId={requestId}
      isActive
      selections={selections}
      submitting={submitting}
      onSetToolChoice={setToolChoice}
      onSubmit={() => void submit(selections)}
    />
  );
}
