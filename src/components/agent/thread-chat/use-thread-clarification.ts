import { useCallback, useMemo, useState } from "react";

import type {
  AnswerSubmission,
  ClarificationResponseContent,
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
  const [optimisticAnswers, setOptimisticAnswers] = useState<
    Record<string, AnswerSubmission>
  >({});

  const responseFromMessagesById = useMemo(() => {
    const map = new Map<string, ClarificationResponseContent>();
    for (const message of messages) {
      if (
        message.content.type === "clarification_response" &&
        message.content.request_message_id
      ) {
        map.set(message.content.request_message_id, message.content);
      }
    }
    return map;
  }, [messages]);

  const expiredClarificationRequestIds = useMemo(() => {
    const expired = new Set<string>();
    for (let i = 0; i < messages.length; i += 1) {
      const m = messages[i];
      if (m.content.type !== "clarification_request") continue;
      const id = String(m.id);
      if (responseFromMessagesById.has(id)) continue;
      const hasLaterUserMessage = messages
        .slice(i + 1)
        .some((later) => later.content.type === "user_message");
      if (hasLaterUserMessage) expired.add(id);
    }
    return expired;
  }, [messages, responseFromMessagesById]);

  const clarificationResponseByRequestId = useMemo(() => {
    const map = new Map<string, ClarificationResponseContent>(
      responseFromMessagesById,
    );
    for (const [requestId, submission] of Object.entries(optimisticAnswers)) {
      if (map.has(requestId)) continue;
      map.set(requestId, {
        type: "clarification_response",
        request_message_id: requestId,
        answers: submission.answers,
      });
    }
    return map;
  }, [responseFromMessagesById, optimisticAnswers]);

  const activeClarificationRequestId = useMemo(() => {
    if (!pendingClarificationRequest) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.content.type !== "clarification_request") continue;
      const id = String(message.id);
      if (clarificationResponseByRequestId.has(id)) continue;
      if (expiredClarificationRequestIds.has(id)) continue;
      return id;
    }
    return null;
  }, [
    messages,
    pendingClarificationRequest,
    clarificationResponseByRequestId,
    expiredClarificationRequestIds,
  ]);

  const effectiveSubmittingClarificationRequestId = useMemo(() => {
    if (!submittingClarificationRequestId) return null;
    if (
      clarificationResponseByRequestId.has(submittingClarificationRequestId) ||
      submittingClarificationRequestId !== activeClarificationRequestId
    ) {
      return null;
    }
    return submittingClarificationRequestId;
  }, [
    activeClarificationRequestId,
    clarificationResponseByRequestId,
    submittingClarificationRequestId,
  ]);

  const submitClarificationAnswer = useCallback(
    async (requestId: string, submission: AnswerSubmission) => {
      if (requestId !== activeClarificationRequestId) return;
      setSubmittingClarificationRequestId(requestId);
      setOptimisticAnswers((prev) => ({ ...prev, [requestId]: submission }));
      const submitted = await submitAnswer(submission);
      if (!submitted) {
        setSubmittingClarificationRequestId(null);
        setOptimisticAnswers((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
      }
    },
    [activeClarificationRequestId, submitAnswer],
  );

  return {
    activeClarificationRequestId,
    submittingClarificationRequestId: effectiveSubmittingClarificationRequestId,
    submitClarificationAnswer,
    clarificationResponseByRequestId,
    expiredClarificationRequestIds,
  };
}
