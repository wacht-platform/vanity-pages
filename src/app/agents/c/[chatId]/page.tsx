"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Workflow,
} from "lucide-react";
import {
  useAgentThreadConversation,
  useAgentThreadFilesystem,
  useAgentThreadTaskGraphs,
  useProjectThreads,
} from "@wacht/nextjs";
import { IconFolderCode } from "@tabler/icons-react";

import type { AgentThread, ThreadTaskGraphBundle } from "@wacht/types";

import { useActiveAgent } from "@/components/agent-provider";
import { ThreadFilesystemPane } from "@/components/agent/thread-chat/filesystem-pane";
import { ThreadMessageList } from "@/components/agent/thread-chat/message-list";
import { useThreadApproval } from "@/components/agent/thread-chat/use-thread-approval";
import { useThreadClarification } from "@/components/agent/thread-chat/use-thread-clarification";
import { useThreadFilesystemPane } from "@/components/agent/thread-chat/use-thread-filesystem-pane";
import { ThreadTaskGraphDrawer } from "@/components/agent/thread-task-graph-drawer";
import { ChatInput } from "@/components/chat/chat-input";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DraftMessage = {
  text: string;
  files: File[];
};

type ThreadStatusKind = "active" | "completed" | "attention" | "idle";
type NewThreadRunHandoff = {
  threadId: string;
  message: string;
  expiresAt: number;
};

const NEW_THREAD_RUN_HANDOFF_PREFIX = "wacht:new-thread-run:";
const NEW_THREAD_RUN_HANDOFF_TTL_MS = 60_000;

const ACTIVE_THREAD_STATUSES = new Set<AgentThread["status"]>([
  "running",
  "in_progress",
]);
const COMPLETED_THREAD_STATUSES = new Set<AgentThread["status"]>([
  "completed",
]);
const ATTENTION_THREAD_STATUSES = new Set<AgentThread["status"]>([
  "failed",
  "blocked",
  "rejected",
]);

function getThreadStatusKind(
  status: AgentThread["status"] | undefined,
  isRunning: boolean,
): ThreadStatusKind {
  if (isRunning || (status && ACTIVE_THREAD_STATUSES.has(status))) {
    return "active";
  }

  if (status && COMPLETED_THREAD_STATUSES.has(status)) {
    return "completed";
  }

  if (status && ATTENTION_THREAD_STATUSES.has(status)) {
    return "attention";
  }

  return "idle";
}

function getThreadStatusMeta(kind: ThreadStatusKind) {
  if (kind === "active") {
    return {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Running",
      className: "text-blue-600 dark:text-blue-400",
    };
  }

  if (kind === "completed") {
    return {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Completed",
      className: "text-emerald-600 dark:text-emerald-400",
    };
  }

  if (kind === "attention") {
    return {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: "Needs attention",
      className: "text-rose-600 dark:text-rose-400",
    };
  }

  return {
    icon: <Clock3 className="h-3.5 w-3.5" />,
    label: "Idle",
    className: "text-muted-foreground",
  };
}

function createChatTitle(thread: AgentThread | null, threadId: string | null) {
  const title = thread?.title?.trim();
  if (title) return title;
  return threadId ? `thr-${threadId.slice(-6)}` : "New Chat";
}

function createDraftTitle(message: string) {
  return message.trim().slice(0, 50) || "New chat";
}

function newThreadRunHandoffKey(threadId: string) {
  return `${NEW_THREAD_RUN_HANDOFF_PREFIX}${threadId}`;
}

function readNewThreadRunHandoff(threadId: string | null) {
  if (!threadId || typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(newThreadRunHandoffKey(threadId));
    if (!raw) return null;

    const handoff = JSON.parse(raw) as Partial<NewThreadRunHandoff>;
    if (
      handoff.threadId !== threadId ||
      typeof handoff.message !== "string" ||
      typeof handoff.expiresAt !== "number" ||
      handoff.expiresAt <= Date.now()
    ) {
      window.sessionStorage.removeItem(newThreadRunHandoffKey(threadId));
      return null;
    }

    return handoff as NewThreadRunHandoff;
  } catch {
    return null;
  }
}

function writeNewThreadRunHandoff(threadId: string, message: string) {
  if (typeof window === "undefined") return;

  const handoff: NewThreadRunHandoff = {
    threadId,
    message,
    expiresAt: Date.now() + NEW_THREAD_RUN_HANDOFF_TTL_MS,
  };

  try {
    window.sessionStorage.setItem(
      newThreadRunHandoffKey(threadId),
      JSON.stringify(handoff),
    );
  } catch {}
}

function clearNewThreadRunHandoff(threadId: string | null) {
  if (!threadId || typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(newThreadRunHandoffKey(threadId));
  } catch {}
}

function hasAgentSideMessage(messages: Array<{ content: { type: string } }>) {
  return messages.some((message) => message.content.type !== "user_message");
}

function hasUserMessage(
  messages: Array<{ content: { type: string; message?: string } }>,
  text: string,
) {
  const normalizedText = text.trim();
  return messages.some(
    (message) =>
      message.content.type === "user_message" &&
      message.content.message?.trim() === normalizedText,
  );
}

export default function SingleChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageShellRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isLoadingHistoryRef = React.useRef(false);
  const sentInitialRef = React.useRef(false);

  const chatId = params?.chatId as string;
  const isDraftChat = chatId === "new";
  const draftProjectId = searchParams?.get("projectId");
  const initialMessage = searchParams?.get("message");

  const [queuedDraftMessage, setQueuedDraftMessage] =
    React.useState<DraftMessage | null>(null);
  const [createdThread, setCreatedThread] =
    React.useState<AgentThread | null>(null);
  const [draftAgentId, setDraftAgentId] = React.useState<string>("");
  const [draftThreadCreationError, setDraftThreadCreationError] =
    React.useState<string | null>(null);
  const [newThreadRunHandoff, setNewThreadRunHandoff] =
    React.useState<NewThreadRunHandoff | null>(() =>
      readNewThreadRunHandoff(
        chatId && chatId !== "new" ? String(chatId) : null,
      ),
    );
  const [showTaskGraph, setShowTaskGraph] = React.useState(false);
  const [activeGraphId, setActiveGraphId] = React.useState<string | null>(null);
  const resolvedThreadId = isDraftChat ? createdThread?.id ?? null : chatId;

  const { agents } = useActiveAgent();
  const { createThread } = useProjectThreads(draftProjectId ?? undefined, {
    enabled: isDraftChat && !!draftProjectId,
  });
  const {
    thread,
    messages,
    sendMessage,
    submitApprovalResponse,
    cancelExecution,
    hasActiveRun,
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
  } = useAgentThreadConversation({
    threadId: resolvedThreadId ?? "",
    initialThread: createdThread,
  });
  const {
    filesystem,
    filesystemLoading,
    filesystemError,
    getFile,
    listDirectory,
    refetch: refetchFilesystem,
  } = useAgentThreadFilesystem(
    resolvedThreadId ?? undefined,
    !!resolvedThreadId,
  );
  const {
    graphs: taskGraphs,
    has_more: hasMoreGraphs,
    loadingMore: loadingMoreGraphs,
    loadMore: loadMoreGraphs,
  } = useAgentThreadTaskGraphs(
    resolvedThreadId ?? undefined,
    !!resolvedThreadId && showTaskGraph,
  );

  const latestRenderedMessageId = messages[messages.length - 1]?.id ?? null;
  const pendingFilesCount = pendingFiles?.length ?? 0;
  const filesystemEntries = React.useMemo(
    () => filesystem?.files || [],
    [filesystem],
  );
  const draftAgentOptions = React.useMemo(
    () =>
      agents.map((agent) => ({
        value: agent.id,
        label: agent.name,
      })),
    [agents],
  );
  const selectedDraftAgentId = React.useMemo(() => {
    if (draftAgentId && agents.some((agent) => agent.id === draftAgentId)) {
      return draftAgentId;
    }

    return agents[0]?.id ?? "";
  }, [agents, draftAgentId]);

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

  const filesystemPane = useThreadFilesystemPane({
    filesystemEntries,
    filesystemLoading,
    filesystemError,
    getFile,
    listDirectory,
    refetchFilesystem,
    pageShellRef,
  });

  const effectiveActiveGraphId = React.useMemo(() => {
    if (!taskGraphs.length) return null;
    if (
      activeGraphId &&
      taskGraphs.some((bundle) => bundle.graph.id === activeGraphId)
    ) {
      return activeGraphId;
    }
    return taskGraphs[0].graph.id;
  }, [taskGraphs, activeGraphId]);
  const activeGraphBundle = React.useMemo(() => {
    if (!effectiveActiveGraphId) return null;
    return (
      taskGraphs.find(
        (bundle: ThreadTaskGraphBundle) =>
          bundle.graph.id === effectiveActiveGraphId,
      ) ?? null
    );
  }, [taskGraphs, effectiveActiveGraphId]);

  const handleSend = React.useCallback(
    async (text: string, files?: File[]) => {
      if (!isDraftChat) {
        setDraftThreadCreationError(null);
        await sendMessage(text, files);
        return;
      }

      if (!draftProjectId) return;
      if (!selectedDraftAgentId) {
        setDraftThreadCreationError(
          "Select an agent before starting the thread.",
        );
        return;
      }

      setDraftThreadCreationError(null);
      const result = await createThread({
        agent_id: selectedDraftAgentId,
        title: createDraftTitle(text),
        thread_purpose: "conversation",
      });
      const thread = result.data;

      writeNewThreadRunHandoff(thread.id, text);
      setNewThreadRunHandoff(readNewThreadRunHandoff(thread.id));
      setCreatedThread(thread);
      setQueuedDraftMessage({
        text,
        files: files ?? [],
      });
      router.replace(`/agents/c/${thread.id}`);
    },
    [
      createThread,
      draftProjectId,
      isDraftChat,
      router,
      sendMessage,
      selectedDraftAgentId,
    ],
  );

  React.useEffect(() => {
    if (!queuedDraftMessage || !resolvedThreadId) return;

    const run = async () => {
      await sendMessage(queuedDraftMessage.text, queuedDraftMessage.files);
      setQueuedDraftMessage(null);
    };

    void run();
  }, [queuedDraftMessage, resolvedThreadId, sendMessage]);

  React.useEffect(() => {
    if (!resolvedThreadId) {
      window.setTimeout(() => setNewThreadRunHandoff(null), 0);
      return;
    }

    window.setTimeout(
      () => setNewThreadRunHandoff(readNewThreadRunHandoff(resolvedThreadId)),
      0,
    );
  }, [resolvedThreadId]);

  React.useEffect(() => {
    if (!newThreadRunHandoff || newThreadRunHandoff.threadId !== resolvedThreadId) {
      return;
    }

    if (newThreadRunHandoff.expiresAt <= Date.now() || hasAgentSideMessage(messages)) {
      clearNewThreadRunHandoff(resolvedThreadId);
      window.setTimeout(() => setNewThreadRunHandoff(null), 0);
    }
  }, [messages, newThreadRunHandoff, resolvedThreadId]);

  React.useEffect(() => {
    if (!newThreadRunHandoff) return;

    const timeoutMs = Math.max(0, newThreadRunHandoff.expiresAt - Date.now());
    const timeout = window.setTimeout(() => {
      clearNewThreadRunHandoff(newThreadRunHandoff.threadId);
      setNewThreadRunHandoff(null);
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [newThreadRunHandoff]);

  React.useEffect(() => {
    if (!initialMessage || sentInitialRef.current) return;

    sentInitialRef.current = true;
    void handleSend(initialMessage);
    window.history.replaceState({}, "", window.location.pathname);
  }, [handleSend, initialMessage]);

  React.useLayoutEffect(() => {
    if (!isLoadingHistoryRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
    isLoadingHistoryRef.current = false;
  }, [
    latestRenderedMessageId,
    pendingMessage,
    pendingFilesCount,
    hasActiveRun,
  ]);

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;

    if (container.scrollTop < 100) {
      isLoadingHistoryRef.current = true;
      const previousScrollHeight = container.scrollHeight;

      loadMoreMessages().then(() => {
        requestAnimationFrame(() => {
          if (!scrollContainerRef.current) return;
          const nextScrollHeight = scrollContainerRef.current.scrollHeight;
          scrollContainerRef.current.scrollTop =
            nextScrollHeight - previousScrollHeight;
        });
      });
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

  const handleReachGraphStripEnd = React.useCallback(() => {
    void loadMoreGraphs();
  }, [loadMoreGraphs]);

  const showInitialLoading =
    !!resolvedThreadId &&
    messagesLoading &&
    messages.length === 0 &&
    !pendingMessage &&
    !(pendingFiles && pendingFiles.length > 0);
  const chatTitle = createChatTitle(thread, resolvedThreadId);
  const hasNewThreadRunHandoff =
    !!newThreadRunHandoff &&
    newThreadRunHandoff.threadId === resolvedThreadId;
  const showRunFeedback = isRunning || hasNewThreadRunHandoff;
  const showHandoffPendingMessage =
    hasNewThreadRunHandoff &&
    !hasUserMessage(messages, newThreadRunHandoff.message);
  const displayedPendingMessage =
    pendingMessage ?? (showHandoffPendingMessage ? newThreadRunHandoff.message : null);
  const threadStatusKind = getThreadStatusKind(thread?.status, showRunFeedback);
  const threadStatusMeta = getThreadStatusMeta(threadStatusKind);

  return (
    <div
      ref={pageShellRef}
      className={cn(
        "relative h-full overflow-hidden bg-background",
        filesystemPane.isFilesystemResizing && "select-none",
      )}
    >
      <div className="flex h-full w-full flex-col pb-2 md:pb-3">
        <AgentNavbar
          left={(
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-base font-normal text-foreground">
                {chatTitle}
              </h1>
              {(thread || showRunFeedback) ? (
                <div
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center",
                    threadStatusMeta.className,
                  )}
                  title={threadStatusMeta.label}
                >
                  {threadStatusMeta.icon}
                </div>
              ) : null}
            </div>
          )}
          right={(
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowTaskGraph((current) => !current)}
                disabled={!resolvedThreadId}
                title="Task graph"
              >
                <Workflow className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  filesystemPane.setShowFilesystem((current) => !current)
                }
                disabled={!resolvedThreadId}
                title="Files"
              >
                <IconFolderCode className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <ThreadMessageList
              messages={messages}
              showInitialLoading={showInitialLoading}
              isLoadingMore={isLoadingMore}
              scrollContainerRef={scrollContainerRef}
              onScroll={handleScroll}
              activeApprovalRequestId={activeApprovalRequestId}
              approvalSelections={approvalSelections}
              submittingApprovalRequestId={submittingApprovalRequestId}
              onSetApprovalChoice={setApprovalChoice}
              onSubmitApprovalRequest={submitApprovalRequest}
              activeClarificationRequestId={activeClarificationRequestId}
              submittingClarificationRequestId={submittingClarificationRequestId}
              onSubmitClarificationAnswer={submitClarificationAnswer}
              clarificationResponseByRequestId={clarificationResponseByRequestId}
              expiredClarificationRequestIds={expiredClarificationRequestIds}
              resolveMessageFileUrl={resolveMessageFileUrl}
              onOpenAttachmentPath={filesystemPane.openFilesystemPath}
              pendingMessage={displayedPendingMessage}
              pendingFiles={pendingFiles}
              isRunning={showRunFeedback}
            />

            <div className="bg-background px-3 pb-3 pt-2">
              <div className="mx-auto w-full max-w-3xl">
                {showRunFeedback ? (
                  <div className="mb-2 flex items-center justify-between px-1 py-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400">
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
                {draftThreadCreationError ? (
                  <div className="mb-2 rounded-md border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    {draftThreadCreationError}
                  </div>
                ) : null}
                <ChatInput
                  placeholder="Reply…"
                  onSend={handleSend}
                  isSending={
                    Boolean(displayedPendingMessage) || Boolean(pendingFiles?.length)
                  }
                  agentOptions={isDraftChat ? draftAgentOptions : undefined}
                  selectedAgentId={
                    isDraftChat ? selectedDraftAgentId : undefined
                  }
                  onSelectedAgentIdChange={
                    isDraftChat ? setDraftAgentId : undefined
                  }
                />
              </div>
            </div>
          </div>

          <ThreadFilesystemPane
            showFilesystem={filesystemPane.showFilesystem}
            activeFilesystemPaneWidth={filesystemPane.activeFilesystemPaneWidth}
            startFilesystemResize={filesystemPane.startFilesystemResize}
            onClose={() => filesystemPane.setShowFilesystem(false)}
            onRefresh={filesystemPane.refreshFilesystemTree}
            filesystemSelection={filesystemPane.filesystemSelection}
            setFilesystemSelection={filesystemPane.setFilesystemSelection}
            expandedFilesystemDirs={filesystemPane.expandedFilesystemDirs}
            filesystemTreeEntries={filesystemPane.filesystemTreeEntries}
            filesystemTreeLoading={filesystemPane.filesystemTreeLoading}
            filesystemTreeErrors={filesystemPane.filesystemTreeErrors}
            rootFilesystemEntries={filesystemPane.rootFilesystemEntries}
            rootFilesystemLoading={filesystemPane.rootFilesystemLoading}
            rootFilesystemError={filesystemPane.rootFilesystemError}
            selectedFilesystemPreviewPath={filesystemPane.selectedFilesystemPreviewPath}
            selectedFilesystemFileLoading={filesystemPane.selectedFilesystemFileLoading}
            selectedFilesystemFile={filesystemPane.selectedFilesystemFile}
            selectedFilesystemFileError={filesystemPane.selectedFilesystemFileError}
            selectedFilesystemImageUrl={filesystemPane.selectedFilesystemImageUrl}
            onToggleDirectory={filesystemPane.toggleFilesystemDirectory}
            onDownloadSelectedFile={filesystemPane.downloadSelectedFilesystemFile}
          />
        </div>
      </div>

      <ThreadTaskGraphDrawer
        open={showTaskGraph}
        onOpenChange={setShowTaskGraph}
        thread={thread}
        activeBundle={activeGraphBundle}
        allGraphs={taskGraphs}
        hasMoreGraphs={hasMoreGraphs}
        loadingMoreGraphs={loadingMoreGraphs}
        activeGraphId={effectiveActiveGraphId || ""}
        onSelectGraph={setActiveGraphId}
        onReachEnd={handleReachGraphStripEnd}
      />
    </div>
  );
}
