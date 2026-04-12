"use client";

import * as React from "react";
import {
  IconBinaryTree2,
  IconCheck,
  IconCircleCheckFilled,
  IconLoader2,
  IconPlayerPauseFilled,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Background, Handle, MarkerType, Position, ReactFlow } from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import type {
  AgentThread,
  ThreadTaskEdge,
  ThreadTaskGraphBundle,
  ThreadTaskNode,
} from "@wacht/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import "@xyflow/react/dist/style.css";

type PositionedNode = ThreadTaskNode & {
  depth: number;
  lane: number;
  x: number;
  y: number;
};

type TaskNodeData = {
  title: string;
  description?: string;
  status?: string;
  priority: number;
};

type GraphRunState = {
  label: string;
  tone: "muted" | "primary" | "success" | "danger";
};

function safeGraphNodes(bundle?: ThreadTaskGraphBundle | null) {
  return bundle?.nodes || [];
}

function safeGraphEdges(bundle?: ThreadTaskGraphBundle | null) {
  return bundle?.edges || [];
}

function countByStatus(nodes: ThreadTaskNode[], statuses: string[]) {
  return nodes.filter((n) => statuses.includes(n.status)).length;
}

function isThreadOpen(thread: AgentThread | null) {
  if (!thread) return false;
  return !["completed", "failed", "interrupted"].includes(thread.status);
}

function isAwaitingNextTaskBundle(
  thread: AgentThread | null,
  bundle: ThreadTaskGraphBundle | null,
  isLatest: boolean,
) {
  if (!thread || !bundle || !isLatest) return false;
  if (!isThreadOpen(thread)) return false;
  if ((bundle.nodes || []).length > 0) return false;
  const graphStatus = bundle.summary?.graph_status || bundle.graph.status;
  return !["failed", "cancelled"].includes(graphStatus);
}

function deriveGraphRunState(
  thread: AgentThread | null,
  bundle: ThreadTaskGraphBundle | null,
): GraphRunState {
  if (!bundle) return { label: "No task run", tone: "muted" };
  const summary = bundle.summary;
  const graphStatus = summary?.graph_status || bundle.graph.status;
  const hasRunningNodes = (summary?.in_progress_nodes || 0) > 0;
  const hasFailedNodes =
    (summary?.failed_nodes || 0) > 0 || (summary?.cancelled_nodes || 0) > 0;
  const graphCompleted = graphStatus === "completed";
  if (hasRunningNodes || graphStatus === "running" || graphStatus === "in_progress") {
    return { label: "In progress", tone: "primary" };
  }
  if (hasFailedNodes || graphStatus === "failed" || graphStatus === "cancelled") {
    return { label: "Failed", tone: "danger" };
  }
  if (graphCompleted && isThreadOpen(thread)) {
    return { label: "Awaiting next task", tone: "primary" };
  }
  if (graphCompleted) {
    return { label: "Completed", tone: "success" };
  }
  return { label: "Queued", tone: "muted" };
}

function graphToneClasses(tone: GraphRunState["tone"]) {
  switch (tone) {
    case "primary":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "success":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "danger":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    default:
      return "bg-accent/30 text-muted-foreground border-border";
  }
}

function graphStepIcon(status?: string) {
  switch (status) {
    case "completed":
      return <IconCircleCheckFilled size={14} stroke={1.8} />;
    case "running":
    case "in_progress":
    case "available":
    case "claimed":
      return <IconLoader2 size={10} stroke={1.8} className="animate-spin" />;
    case "failed":
    case "blocked":
    case "rejected":
    case "cancelled":
      return <IconX size={14} stroke={1.8} />;
    default:
      return <IconSearch size={14} stroke={1.8} />;
  }
}

function buildGraphLayout(nodes: ThreadTaskNode[], edges: ThreadTaskEdge[]) {
  const incoming = new Map<string, string[]>();
  for (const node of nodes) incoming.set(node.id, []);
  for (const edge of edges) incoming.get(edge.to_node_id)?.push(edge.from_node_id);

  const memo = new Map<string, number>();
  const getDepth = (nodeId: string): number => {
    const cached = memo.get(nodeId);
    if (cached !== undefined) return cached;
    const parents = incoming.get(nodeId) || [];
    const depth = parents.length === 0 ? 0 : Math.max(...parents.map(getDepth)) + 1;
    memo.set(nodeId, depth);
    return depth;
  };
  for (const node of nodes) getDepth(node.id);

  const grouped = new Map<number, ThreadTaskNode[]>();
  for (const node of nodes) {
    const depth = memo.get(node.id) || 0;
    grouped.set(depth, [...(grouped.get(depth) || []), node]);
  }

  const levels = [...grouped.keys()].sort((a, b) => a - b);
  const cardWidth = 220;
  const cardHeight = 56;
  const horizontalGap = 40;
  const verticalGap = 40;
  const positionedNodes: PositionedNode[] = [];

  levels.forEach((depth) => {
    const levelNodes = [...(grouped.get(depth) || [])].sort((a, b) => {
      const diff = (a.priority ?? 0) - (b.priority ?? 0);
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });
    const rowWidth =
      levelNodes.length * cardWidth + Math.max(levelNodes.length - 1, 0) * horizontalGap;
    const rowStartX = Math.max(60, (900 - rowWidth) / 2);
    levelNodes.forEach((node, lane) => {
      positionedNodes.push({
        ...node,
        depth,
        lane,
        x: rowStartX + lane * (cardWidth + horizontalGap),
        y: 48 + depth * (cardHeight + verticalGap),
      });
    });
  });

  const depthCount = Math.max(levels.length, 1);
  const laneCount = Math.max(1, ...levels.map((d) => (grouped.get(d) || []).length));
  return {
    positionedNodes,
    width: Math.max(960, laneCount * (cardWidth + horizontalGap) + 120),
    height: Math.max(460, depthCount * (cardHeight + verticalGap) + 120),
  };
}

function TaskStageNode({ data, selected }: NodeProps<Node<TaskNodeData>>) {
  const isCompleted = data.status === "completed";
  const isFailed = ["failed", "blocked", "rejected", "cancelled"].includes(data.status!);
  const isRunning = ["running", "in_progress", "available", "claimed"].includes(data.status!);
  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0 !border-0" isConnectable={false} />
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "w-[220px] h-[56px] flex items-center px-3 gap-3 rounded-md bg-card border transition-all duration-200 shadow-sm text-left",
              selected
                ? "border-border ring-1 ring-border/40 shadow-md bg-accent/20"
                : "border-border/50 hover:border-border hover:shadow-md",
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : isRunning
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    : isFailed
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : "bg-muted/50 text-muted-foreground border-border/30",
              )}
            >
              {graphStepIcon(data.status)}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <div className="text-xs text-foreground truncate leading-none">{data.title}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isCompleted
                        ? "bg-emerald-500"
                        : isRunning
                          ? "bg-blue-500"
                          : isFailed
                            ? "bg-rose-500"
                            : "bg-muted-foreground/50",
                    )}
                  />
                  {data.status || "Pending"}
                </div>
                <div>P{data.priority}</div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="bg-popover border-border text-popover-foreground max-w-xs p-3">
          <div className="space-y-2">
            <div className="text-sm leading-tight text-foreground">{data.title}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={cn(isCompleted ? "text-emerald-500" : isRunning ? "text-blue-500" : isFailed ? "text-rose-500" : "")}>{data.status || "Pending"}</span>
              <span>P{data.priority}</span>
            </div>
            {data.description ? (
              <div className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">{data.description}</div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !border-0" isConnectable={false} />
    </>
  );
}

const graphNodeTypes = { task: TaskStageNode };

function GraphDrawerContent({
  thread,
  activeBundle,
  allGraphs,
  hasMoreGraphs,
  loadingMoreGraphs,
  activeGraphId,
  onSelectGraph,
  onReachEnd,
}: {
  thread: AgentThread;
  activeBundle: ThreadTaskGraphBundle;
  allGraphs: ThreadTaskGraphBundle[];
  hasMoreGraphs: boolean;
  loadingMoreGraphs: boolean;
  activeGraphId: string;
  onSelectGraph: (id: string) => void;
  onReachEnd: () => void;
}) {
  const nodes = safeGraphNodes(activeBundle);
  const edges = safeGraphEdges(activeBundle);
  const isLatest = activeBundle.graph.id === allGraphs[0]?.graph.id;
  const completed = countByStatus(nodes, ["completed"]);
  const active = countByStatus(nodes, ["running", "in_progress", "available", "claimed"]);
  const failed = countByStatus(nodes, ["failed", "blocked", "rejected", "cancelled"]);
  const runState = deriveGraphRunState(thread, activeBundle);

  const layout = React.useMemo(() => buildGraphLayout(nodes, edges), [nodes, edges]);

  const flowNodes = React.useMemo<Node<TaskNodeData>[]>(
    () =>
      layout.positionedNodes.map((node) => ({
        id: node.id,
        type: "task",
        position: { x: node.x, y: node.y },
        draggable: false,
        selectable: true,
        data: {
          title: node.title,
          description: node.description || undefined,
          status: node.status,
          priority: node.priority,
        },
      })),
    [layout.positionedNodes],
  );

  const nodeById = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const flowEdges = React.useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const fromNode = nodeById.get(edge.from_node_id);
        const isAnimated = !!fromNode && ["running", "in_progress"].includes(fromNode.status);
        const edgeColor = isAnimated ? "#3b82f6" : "#a1a1aa";
        return {
          id: `${edge.from_node_id}:${edge.to_node_id}`,
          source: edge.from_node_id,
          target: edge.to_node_id,
          type: "smoothstep",
          selectable: false,
          animated: isAnimated,
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: edgeColor },
          style: { stroke: edgeColor, strokeWidth: isAnimated ? 1.5 : 1 },
        };
      }),
    [edges, nodeById],
  );

  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const handleStripScroll = React.useCallback(() => {
    const el = stripRef.current;
    if (!el || !hasMoreGraphs || loadingMoreGraphs) return;
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < 240) onReachEnd();
  }, [hasMoreGraphs, loadingMoreGraphs, onReachEnd]);

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/50 border border-border">
            <IconBinaryTree2 size={12} className="text-muted-foreground" />
          </div>
          <span className="text-sm text-foreground">Task execution</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/10">
              <IconCheck size={8} className="text-emerald-500" />
            </div>
            <span className="text-muted-foreground">Completed <span className="text-foreground">{completed}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500/10">
              <IconPlayerPauseFilled size={6} className="text-blue-500" />
            </div>
            <span className="text-muted-foreground">Active <span className="text-foreground">{active}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/10">
              <IconX size={8} className="text-rose-500" />
            </div>
            <span className="text-muted-foreground">Failed <span className="text-foreground">{failed}</span></span>
          </div>
          <div className={cn("shrink-0 rounded-md border text-xs px-2 py-0.5", graphToneClasses(runState.tone))}>
            {runState.label}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 relative">
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isAwaitingNextTaskBundle(thread, activeBundle, isLatest)
              ? "Awaiting next task"
              : "No task nodes in this run."}
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={graphNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            zoomOnScroll
            className="bg-transparent"
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: "smoothstep" }}
          >
            <Background gap={24} size={1} color="#27272a" />
          </ReactFlow>
        )}
      </div>
      <div
        ref={stripRef}
        onScroll={handleStripScroll}
        className="flex items-center gap-2 px-5 py-2.5 border-t border-border overflow-x-auto scrollbar-hide shrink-0"
      >
        {allGraphs.map((bundle, index) => {
          const isActive = bundle.graph.id === activeGraphId;
          const awaiting = isAwaitingNextTaskBundle(thread, bundle, index === 0);
          const label = awaiting
            ? "Awaiting next task"
            : bundle.nodes?.[0]?.title || `Run ${bundle.graph.version || index + 1}`;
          const rs = deriveGraphRunState(thread, bundle);
          return (
            <button
              key={bundle.graph.id}
              onClick={() => onSelectGraph(bundle.graph.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors border shrink-0",
                isActive
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-accent/30 hover:text-foreground",
              )}
              title={label}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  rs.tone === "success"
                    ? "bg-emerald-500"
                    : rs.tone === "danger"
                      ? "bg-rose-500"
                      : rs.tone === "primary"
                        ? "bg-blue-500"
                        : "bg-muted-foreground/50",
                )}
              />
              <span className="max-w-[180px] truncate">{label}</span>
            </button>
          );
        })}
        {loadingMoreGraphs && (
          <div className="flex shrink-0 items-center gap-2 px-2 text-xs text-muted-foreground">
            <IconLoader2 size={12} stroke={1.8} className="animate-spin" />
            <span>Loading more runs</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThreadTaskGraphDrawer({
  open,
  onOpenChange,
  thread,
  activeBundle,
  allGraphs,
  hasMoreGraphs,
  loadingMoreGraphs,
  activeGraphId,
  onSelectGraph,
  onReachEnd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: AgentThread | null;
  activeBundle: ThreadTaskGraphBundle | null;
  allGraphs: ThreadTaskGraphBundle[];
  hasMoreGraphs: boolean;
  loadingMoreGraphs: boolean;
  activeGraphId: string;
  onSelectGraph: (id: string) => void;
  onReachEnd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:max-w-[900px]",
            "bg-background border-l border-border shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
            "duration-300 ease-in-out",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Thread Task Graph</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">View the task graph execution for this thread.</DialogPrimitive.Description>

          {activeBundle && thread ? (
            <GraphDrawerContent
              thread={thread}
              activeBundle={activeBundle}
              allGraphs={allGraphs}
              hasMoreGraphs={hasMoreGraphs}
              loadingMoreGraphs={loadingMoreGraphs}
              activeGraphId={activeGraphId}
              onSelectGraph={onSelectGraph}
              onReachEnd={onReachEnd}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No task graph runs yet.
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
