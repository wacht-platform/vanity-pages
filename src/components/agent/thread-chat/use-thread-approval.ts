import { useCallback, useMemo, useState } from "react";

import type {
  ApprovalRequestContent,
  ConversationMessage,
  ThreadPendingApprovalRequestState,
  ToolApprovalDecision,
} from "@wacht/types";

import type { ApprovalChoice } from "./shared";

function matchesPendingApprovalRequest(
  content: ApprovalRequestContent,
  pendingApprovalRequest: ThreadPendingApprovalRequestState | null,
) {
  if (!pendingApprovalRequest) return false;

  const requestedToolNames = new Set(
    pendingApprovalRequest.tools.map((tool) => tool.tool_name),
  );

  if (requestedToolNames.size !== content.tools.length) {
    return false;
  }

  return (
    pendingApprovalRequest.description === content.description &&
    content.tools.every((tool) => requestedToolNames.has(tool.tool_name))
  );
}

export function useThreadApproval({
  messages,
  pendingApprovalRequest,
  submitApprovalResponse,
}: {
  messages: ConversationMessage[];
  pendingApprovalRequest: ThreadPendingApprovalRequestState | null;
  submitApprovalResponse: (
    requestId: string,
    approvals: ToolApprovalDecision[],
  ) => Promise<boolean>;
}) {
  const [approvalSelectionOverrides, setApprovalSelectionOverrides] = useState<
    Record<string, Record<string, ApprovalChoice>>
  >({});
  const [submittingApprovalRequestId, setSubmittingApprovalRequestId] =
    useState<string | null>(null);

  const resolvedApprovalRequestIds = useMemo(() => {
    const resolved = new Set<string>();
    for (const message of messages) {
      if (message.content.type === "approval_response") {
        const requestMessageId = (
          message.content as { request_message_id?: string }
        ).request_message_id;
        if (requestMessageId) {
          resolved.add(requestMessageId);
        }
      }
    }
    return resolved;
  }, [messages]);

  const activeApprovalRequestId = useMemo(() => {
    if (!pendingApprovalRequest) {
      return null;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message.content.type === "approval_request" &&
        !resolvedApprovalRequestIds.has(String(message.id)) &&
        matchesPendingApprovalRequest(message.content, pendingApprovalRequest)
      ) {
        return String(message.id);
      }
    }

    return null;
  }, [messages, pendingApprovalRequest, resolvedApprovalRequestIds]);

  const defaultApprovalSelections = useMemo(() => {
    if (!activeApprovalRequestId) {
      return {};
    }

    const activeRequestMessage = messages.find(
      (message) =>
        String(message.id) === activeApprovalRequestId &&
        message.content.type === "approval_request" &&
        !resolvedApprovalRequestIds.has(activeApprovalRequestId),
    );

    if (!activeRequestMessage || activeRequestMessage.content.type !== "approval_request") {
      return {};
    }

    return Object.fromEntries(
      activeRequestMessage.content.tools.map((tool) => [tool.tool_name, "deny" as const]),
    );
  }, [activeApprovalRequestId, messages, resolvedApprovalRequestIds]);

  const approvalSelections = useMemo(() => {
    if (!activeApprovalRequestId) {
      return {};
    }

    return {
      ...approvalSelectionOverrides,
      [activeApprovalRequestId]: {
        ...defaultApprovalSelections,
        ...(approvalSelectionOverrides[activeApprovalRequestId] ?? {}),
      },
    };
  }, [
    activeApprovalRequestId,
    approvalSelectionOverrides,
    defaultApprovalSelections,
  ]);

  const effectiveSubmittingApprovalRequestId = useMemo(() => {
    if (!submittingApprovalRequestId) {
      return null;
    }

    if (
      resolvedApprovalRequestIds.has(submittingApprovalRequestId) ||
      submittingApprovalRequestId !== activeApprovalRequestId
    ) {
      return null;
    }

    return submittingApprovalRequestId;
  }, [
    activeApprovalRequestId,
    resolvedApprovalRequestIds,
    submittingApprovalRequestId,
  ]);

  const submitApprovalRequest = useCallback(
    async (requestId: string) => {
      if (requestId !== activeApprovalRequestId) return;

      const requestSelections = approvalSelections[requestId];
      if (!requestSelections) return;

      const approvals = Object.entries(requestSelections)
        .filter(([, choice]) => choice !== "deny")
        .map(([tool_name, choice]) => ({
          tool_name,
          mode: choice as ToolApprovalDecision["mode"],
        }));

      setSubmittingApprovalRequestId(requestId);
      const submitted = await submitApprovalResponse(requestId, approvals);
      if (!submitted) {
        setSubmittingApprovalRequestId(null);
      }
    },
    [
      activeApprovalRequestId,
      approvalSelections,
      submitApprovalResponse,
    ],
  );

  const setApprovalChoice = useCallback(
    (
      requestId: string,
      toolName: string,
      choice: ApprovalChoice,
      submitImmediately = false,
    ) => {
      if (requestId !== activeApprovalRequestId) return;

      setApprovalSelectionOverrides((current) => ({
        ...current,
        [requestId]: {
          ...(current[requestId] ?? {}),
          [toolName]: choice,
        },
      }));

      if (!submitImmediately) {
        return;
      }

      void (async () => {
        setSubmittingApprovalRequestId(requestId);
        const submitted = await submitApprovalResponse(
          requestId,
          choice === "deny"
            ? []
            : [
                {
                  tool_name: toolName,
                  mode: choice,
                },
              ],
        );
        if (!submitted) {
          setSubmittingApprovalRequestId(null);
        }
      })();
    },
    [activeApprovalRequestId, submitApprovalResponse],
  );

  return {
    activeApprovalRequestId,
    approvalSelections,
    submittingApprovalRequestId: effectiveSubmittingApprovalRequestId,
    setApprovalChoice,
    submitApprovalRequest,
  };
}
