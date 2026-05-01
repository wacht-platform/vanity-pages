import { useCallback, useMemo, useState } from "react";

import type {
  AnswerSubmission,
  ConversationMessage,
  PendingQuestion,
} from "@wacht/types";

export function useThreadClarification({
  messages,
  pendingClarificationRequest,
  submitAnswer,
}: {
  messages: ConversationMessage[];
  pendingClarificationRequest: PendingQuestion | null;
  submitAnswer: (submission: AnswerSubmission) => Promise<boolean>;
}) {
  const [submittingClarificationRequestId, setSubmittingClarificationRequestId] =
    useState<string | null>(null);

  const resolvedClarificationRequestIds = useMemo(() => {
    const resolved = new Set<string>();
    for (const message of messages) {
      if (message.content.type === "clarification_response") {
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

  const activeClarificationRequestId = useMemo(() => {
    if (!pendingClarificationRequest) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (
        message.content.type === "clarification_request" &&
        !resolvedClarificationRequestIds.has(String(message.id))
      ) {
        return String(message.id);
      }
    }
    return null;
  }, [messages, pendingClarificationRequest, resolvedClarificationRequestIds]);

  const effectiveSubmittingClarificationRequestId = useMemo(() => {
    if (!submittingClarificationRequestId) return null;
    if (
      resolvedClarificationRequestIds.has(submittingClarificationRequestId) ||
      submittingClarificationRequestId !== activeClarificationRequestId
    ) {
      return null;
    }
    return submittingClarificationRequestId;
  }, [
    activeClarificationRequestId,
    resolvedClarificationRequestIds,
    submittingClarificationRequestId,
  ]);

  const submitClarificationAnswer = useCallback(
    async (requestId: string, submission: AnswerSubmission) => {
      if (requestId !== activeClarificationRequestId) return;
      setSubmittingClarificationRequestId(requestId);
      const submitted = await submitAnswer(submission);
      if (!submitted) {
        setSubmittingClarificationRequestId(null);
      }
    },
    [activeClarificationRequestId, submitAnswer],
  );

  return {
    activeClarificationRequestId,
    submittingClarificationRequestId: effectiveSubmittingClarificationRequestId,
    submitClarificationAnswer,
  };
}
