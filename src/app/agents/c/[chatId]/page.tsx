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
  useAgentThread,
  useAgentThreadConversation,
  useAgentThreadFilesystem,
  useAgentThreadTaskGraphs,
  useProjectThreads,
} from "@wacht/nextjs";
import {
  IconFolderCode,
} from "@tabler/icons-react";

import type { ThreadTaskGraphBundle } from "@wacht/types";

import { useActiveAgent } from "@/components/agent-provider";
import { ThreadFilesystemPane } from "@/components/agent/thread-chat/filesystem-pane";
import { ThreadMessageList } from "@/components/agent/thread-chat/message-list";
import { useThreadApproval } from "@/components/agent/thread-chat/use-thread-approval";
import { useThreadFilesystemPane } from "@/components/agent/thread-chat/use-thread-filesystem-pane";
import { ThreadTaskGraphDrawer } from "@/components/agent/thread-task-graph-drawer";
import { ChatInput } from "@/components/chat/chat-input";
import { AgentNavbar } from "@/components/layout/agent-navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getThreadStatusMeta(status?: string) {
  switch (status) {
    case "running":
    case "in_progress":
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: "Running",
        className: "text-blue-600 dark:text-blue-400",
      };
    case "completed":
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Completed",
        className: "text-emerald-600 dark:text-emerald-400",
      };
    case "failed":
    case "blocked":
    case "rejected":
      return {
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        label: "Needs attention",
        className: "text-rose-600 dark:text-rose-400",
      };
    default:
      return {
        icon: <Clock3 className="h-3.5 w-3.5" />,
        label: "Idle",
        className: "text-muted-foreground",
      };
  }
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

  const [resolvedThreadId, setResolvedThreadId] = React.useState<string | null>(
    isDraftChat ? null : chatId,
  );
  const [queuedDraftMessage, setQueuedDraftMessage] = React.useState<{
    text: string;
    files: File[];
  } | null>(null);
  const [draftAgentId, setDraftAgentId] = React.useState<string>("");
  const [draftThreadCreationError, setDraftThreadCreationError] = React.useState<string | null>(null);
  const [showTaskGraph, setShowTaskGraph] = React.useState(false);
  const [activeGraphId, setActiveGraphId] = React.useState<string | null>(null);

  const { agents } = useActiveAgent();
  const { createThread } = useProjectThreads(draftProjectId ?? undefined, {
    enabled: isDraftChat && !!draftProjectId,
  });
  const { thread: graphThread } = useAgentThread(
    resolvedThreadId ?? undefined,
    !!resolvedThreadId,
  );
  const {
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
    activeApprovalRequestId: activeApprovalRequestIdFromState,
    resolveMessageFileUrl,
  } = useAgentThreadConversation({
    threadId: resolvedThreadId ?? "",
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
  const filesystemEntries = React.useMemo(() => filesystem?.files || [], [filesystem]);
  const draftAgentOptions = React.useMemo(
    () =>
      agents.map((agent) => ({
        value: agent.id,
        label: agent.name,
      })),
    [agents],
  );

  React.useEffect(() => {
    if (!isDraftChat) return;

    if (!agents.length) {
      if (draftAgentId) {
        setDraftAgentId("");
      }
      return;
    }

    if (draftAgentId && agents.some((agent) => agent.id === draftAgentId)) {
      return;
    }

    setDraftAgentId(agents[0]?.id ?? "");
  }, [agents, draftAgentId, isDraftChat]);

  const {
    activeApprovalRequestId,
    approvalSelections,
    submittingApprovalRequestId,
    setApprovalChoice,
    submitApprovalRequest,
  } = useThreadApproval({
    messages,
    pendingApprovalRequest,
    activeApprovalRequestIdFromState,
    submitApprovalResponse,
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

  React.useEffect(() => {
    if (!isDraftChat) {
      setResolvedThreadId(chatId);
    }
  }, [chatId, isDraftChat]);

  React.useEffect(() => {
    if (!taskGraphs.length) {
      setActiveGraphId(null);
      return;
    }

    if (
      !activeGraphId ||
      !taskGraphs.some((bundle: ThreadTaskGraphBundle) => bundle.graph.id === activeGraphId)
    ) {
      setActiveGraphId(taskGraphs[0].graph.id);
    }
  }, [taskGraphs, activeGraphId]);

  const activeGraphBundle = React.useMemo(() => {
    if (!taskGraphs.length) return null;
    return (
      taskGraphs.find((bundle: ThreadTaskGraphBundle) => bundle.graph.id === activeGraphId) ||
      taskGraphs[0] ||
      null
    );
  }, [taskGraphs, activeGraphId]);

  const handleSend = React.useCallback(
    async (text: string, files?: File[]) => {
      if (!isDraftChat) {
        setDraftThreadCreationError(null);
        await sendMessage(text, files);
        return;
      }

      if (!draftProjectId) return;
      if (!draftAgentId) {
        setDraftThreadCreationError(
          "Select an agent before starting the thread.",
        );
        return;
      }

      setDraftThreadCreationError(null);
      const result = await createThread({
        agent_id: draftAgentId,
        title: text.trim().slice(0, 50) || "New chat",
        thread_purpose: "conversation",
      });
      const thread = result.data;

      setResolvedThreadId(thread.id);
      setQueuedDraftMessage({
        text,
        files: files ?? [],
      });
      router.replace(`/agents/c/${thread.id}`);
    },
    [createThread, draftAgentId, draftProjectId, isDraftChat, router, sendMessage],
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
    if (!initialMessage || sentInitialRef.current) return;

    sentInitialRef.current = true;
    void handleSend(initialMessage);
    window.history.replaceState({}, "", window.location.pathname);
  }, [handleSend, initialMessage]);

  React.useLayoutEffect(() => {
    if (!isLoadingHistoryRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    isLoadingHistoryRef.current = false;
  }, [latestRenderedMessageId, pendingMessage, pendingFilesCount, hasActiveRun]);

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
          scrollContainerRef.current.scrollTop = nextScrollHeight - previousScrollHeight;
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
  const chatTitle = graphThread?.title?.trim() || (resolvedThreadId ? `thr-${resolvedThreadId.slice(-6)}` : "New Chat");
  const threadStatusMeta = getThreadStatusMeta(graphThread?.status);

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
              <h1 className="truncate text-base font-normal text-foreground">{chatTitle}</h1>
              {graphThread ? (
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
                onClick={() => filesystemPane.setShowFilesystem((current) => !current)}
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
              resolveMessageFileUrl={resolveMessageFileUrl}
              onOpenAttachmentPath={filesystemPane.openFilesystemPath}
              pendingMessage={pendingMessage}
              pendingFiles={pendingFiles}
              isRunning={isRunning}
            />

          <div className="bg-background px-3 pb-3 pt-2">
            <div className="mx-auto w-full max-w-3xl">
              {isRunning ? (
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
                isSending={Boolean(pendingMessage) || Boolean(pendingFiles?.length)}
                agentOptions={isDraftChat ? draftAgentOptions : undefined}
                selectedAgentId={isDraftChat ? draftAgentId : undefined}
                onSelectedAgentIdChange={isDraftChat ? setDraftAgentId : undefined}
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
        thread={graphThread}
        activeBundle={activeGraphBundle}
        allGraphs={taskGraphs}
        hasMoreGraphs={hasMoreGraphs}
        loadingMoreGraphs={loadingMoreGraphs}
        activeGraphId={activeGraphId || ""}
        onSelectGraph={setActiveGraphId}
        onReachEnd={handleReachGraphStripEnd}
      />
    </div>
  );
}
