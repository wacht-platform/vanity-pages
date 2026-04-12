"use client";

import * as React from "react";
import {
  IconBrain,
  IconCircleCheck,
  IconCode,
  IconClock,
  IconDatabaseSearch,
  IconFilePlus,
  IconFileSearch,
  IconFileText,
  IconGitBranch,
  IconListDetails,
  IconMoon,
  IconPhotoSearch,
  IconSearch,
  IconShieldExclamation,
  IconTerminal2,
  IconTool,
  IconWorldSearch,
  IconWriting,
} from "@tabler/icons-react";

import type { SystemDecisionContent, ToolResultContent } from "@wacht/types";

import { JsonViewer } from "@/components/json-viewer";

import {
  getDecisionStepMeta,
  InlineEventRow,
  InlineStatusBadge,
} from "./event-row";
import { LazyCodeFileViewer } from "./lazy-code-file-viewer";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown) {
  return isObjectRecord(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function formatLabel(value: string) {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  if (!normalized) return value;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toolStatus(content: ToolResultContent) {
  if (content.status === "success" || content.status === "completed") return "completed";
  if (content.status === "error" || content.status === "failed") return "failed";
  return "pending";
}

function toolOutputEnvelope(content: ToolResultContent) {
  return asRecord(content.output);
}

function toolOutputData(content: ToolResultContent) {
  const envelope = toolOutputEnvelope(content);
  return asRecord(envelope?.data) ?? envelope;
}

function StatusBadge({ content }: { content: ToolResultContent }) {
  return (
    <InlineStatusBadge
      status={toolStatus(content)}
      label={formatLabel(content.status)}
    />
  );
}

function MetaList({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode | null | undefined }>;
}) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm leading-6 text-muted-foreground/78">
      {visible.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground/55">
            {item.label}
          </span>
          <span className="text-foreground/82">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ToolInlineRow({
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 py-1">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary/70">
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground/85">{title}</span>
        {badge}
      </div>
      {subtitle ? (
        <div className="pl-7 text-sm leading-6 text-muted-foreground/78">{subtitle}</div>
      ) : null}
      <div className="pl-7 space-y-3">{children}</div>
    </div>
  );
}

function CommandBlock({
  command,
  stdout,
  stderr,
}: {
  command: string;
  stdout?: string | null;
  stderr?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900/70 bg-zinc-950 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Shell
        </span>
      </div>
      <div className="space-y-3 px-4 py-4 font-mono text-[12px] leading-6">
        <div className="flex gap-2 text-emerald-300">
          <span className="select-none text-emerald-500">$</span>
          <span className="break-all text-zinc-100">{command}</span>
        </div>
        {stdout ? (
          <pre className="whitespace-pre-wrap break-words text-zinc-300">{stdout}</pre>
        ) : null}
        {stderr ? (
          <pre className="whitespace-pre-wrap break-words text-rose-300">{stderr}</pre>
        ) : null}
      </div>
    </div>
  );
}

type DiffRow =
  | {
      kind: "equal";
      leftLineNumber: number;
      rightLineNumber: number;
      leftText: string;
      rightText: string;
    }
  | {
      kind: "delete";
      leftLineNumber: number;
      rightLineNumber: null;
      leftText: string;
      rightText: "";
    }
  | {
      kind: "insert";
      leftLineNumber: null;
      rightLineNumber: number;
      leftText: "";
      rightText: string;
    };

function splitLines(value: string) {
  if (!value) return [];
  return value.replace(/\r\n/g, "\n").split("\n");
}

function buildLineDiffRows(before: string, after: string): DiffRow[] {
  const left = splitLines(before);
  const right = splitLines(after);
  const dp = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        left[i] === right[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      rows.push({
        kind: "equal",
        leftLineNumber: i + 1,
        rightLineNumber: j + 1,
        leftText: left[i],
        rightText: right[j],
      });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        kind: "delete",
        leftLineNumber: i + 1,
        rightLineNumber: null,
        leftText: left[i],
        rightText: "",
      });
      i += 1;
    } else {
      rows.push({
        kind: "insert",
        leftLineNumber: null,
        rightLineNumber: j + 1,
        leftText: "",
        rightText: right[j],
      });
      j += 1;
    }
  }

  while (i < left.length) {
    rows.push({
      kind: "delete",
      leftLineNumber: i + 1,
      rightLineNumber: null,
      leftText: left[i],
      rightText: "",
    });
    i += 1;
  }

  while (j < right.length) {
    rows.push({
      kind: "insert",
      leftLineNumber: null,
      rightLineNumber: j + 1,
      leftText: "",
      rightText: right[j],
    });
    j += 1;
  }

  return rows;
}

function DiffEditorPane({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/45 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Diff
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-mono text-[12px] leading-6">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="w-12 px-2 py-2 text-right font-medium">Old</th>
              <th className="w-6 px-1 py-2 text-center font-medium" />
              <th className="border-r border-zinc-800 px-3 py-2 text-left font-medium">
                Overwritten
              </th>
              <th className="w-12 px-2 py-2 text-right font-medium">New</th>
              <th className="w-6 px-1 py-2 text-center font-medium" />
              <th className="px-3 py-2 text-left font-medium">Written</th>
            </tr>
          </thead>
          <tbody>
            {buildLineDiffRows(before, after).map((row, index) => {
              const leftCellTone =
                row.kind === "delete"
                  ? "border-l-2 border-rose-400/50 text-rose-100"
                  : "border-l-2 border-transparent";
              const rightCellTone =
                row.kind === "insert"
                  ? "border-l-2 border-emerald-400/50 text-emerald-100"
                  : "border-l-2 border-transparent";
              const leftMarker = row.kind === "delete" ? "-" : "";
              const rightMarker = row.kind === "insert" ? "+" : "";

              return (
                <tr key={`diff-${index}`} className="border-b border-zinc-900/80 align-top bg-zinc-950">
                  <td className="select-none px-2 py-1 text-right text-zinc-500">
                    {row.leftLineNumber ?? ""}
                  </td>
                  <td className={`select-none px-1 py-1 text-center ${row.kind === "delete" ? "text-rose-300" : "text-zinc-700"}`}>
                    {leftMarker}
                  </td>
                  <td className={`border-r border-zinc-800 px-3 py-1 whitespace-pre-wrap break-words ${leftCellTone}`}>
                    {row.leftText || " "}
                  </td>
                  <td className="select-none px-2 py-1 text-right text-zinc-500">
                    {row.rightLineNumber ?? ""}
                  </td>
                  <td className={`select-none px-1 py-1 text-center ${row.kind === "insert" ? "text-emerald-300" : "text-zinc-700"}`}>
                    {rightMarker}
                  </td>
                  <td className={`px-3 py-1 whitespace-pre-wrap break-words ${rightCellTone}`}>
                    {row.rightText || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchResultsList({ results }: { results: unknown[] }) {
  const normalized = results
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item);
  if (normalized.length === 0) return null;

  return (
    <div className="space-y-3">
      {normalized.slice(0, 6).map((item, index) => (
        <div
          key={`${asString(item.url) || asString(item.path) || "item"}-${index}`}
          className="border-l-2 border-border/45 pl-3"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="text-sm font-medium text-foreground/88">
              {asString(item.title) ||
                asString(item.document_title) ||
                asString(item.path) ||
                `Result ${index + 1}`}
            </div>
            {asString(item.url) ? (
              <div className="min-w-0 break-all text-xs text-muted-foreground/70">
                {item.url as string}
              </div>
            ) : null}
          </div>
          {asString(item.excerpt) || asString(item.sample_text) ? (
            <div className="mt-2 text-sm leading-6 text-foreground/78">
              {asString(item.excerpt) || asString(item.sample_text)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ThreadList({ threads }: { threads: unknown[] }) {
  const normalized = threads
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item);
  if (normalized.length === 0) return null;

  return (
    <div className="space-y-3">
      {normalized.slice(0, 6).map((thread, index) => (
        <div
          key={`${asString(thread.thread_id) || "thread"}-${index}`}
          className="border-l-2 border-border/45 pl-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground/88">
              {asString(thread.title) || "Untitled thread"}
            </span>
            {asString(thread.thread_purpose) ? (
              <span className="rounded-full bg-accent/70 px-2 py-0.5 text-[11px] text-foreground/70">
                {thread.thread_purpose as string}
              </span>
            ) : null}
            {asString(thread.status) ? (
              <span className="rounded-full bg-accent/70 px-2 py-0.5 text-[11px] text-foreground/70">
                {thread.status as string}
              </span>
            ) : null}
          </div>
          {asString(thread.responsibility) ? (
            <div className="mt-2 text-sm leading-6 text-foreground/78">
              {thread.responsibility as string}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function UnknownToolCard({ content }: { content: ToolResultContent }) {
  return (
    <ToolInlineRow
      icon={<IconTool className="h-4 w-4" />}
      title={formatLabel(content.tool_name)}
      badge={<StatusBadge content={content} />}
    >
      <div className="rounded-xl border border-border/45 bg-background/60 p-3">
        <JsonViewer data={{ input: content.input, output: content.output }} />
      </div>
    </ToolInlineRow>
  );
}

function ReadFileCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const contentText = asString(output?.content) ?? "";
  const requestedRange =
    [asNumber(input?.start_line), asNumber(input?.end_line)].some((v) => v !== null)
      ? `${input?.start_line ?? "start"}-${input?.end_line ?? "end"}`
      : null;
  return (
    <ToolInlineRow
      icon={<IconFileSearch className="h-4 w-4" />}
      title="Read File"
      subtitle={asString(input?.path)}
      badge={<StatusBadge content={content} />}
    >
      {requestedRange ? (
        <div className="text-xs text-muted-foreground/65">Lines {requestedRange}</div>
      ) : null}
      <LazyCodeFileViewer
        path={asString(input?.path) || "file.txt"}
        value={contentText}
      />
    </ToolInlineRow>
  );
}

function WriteFileCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const path = asString(input?.path) || "file.txt";
  const value = asString(input?.content) || "";
  return (
    <ToolInlineRow
      icon={<IconFilePlus className="h-4 w-4" />}
      title={input?.append === true ? "Append File" : "Write File"}
      subtitle={path}
      badge={<StatusBadge content={content} />}
    >
      <LazyCodeFileViewer path={path} value={value} />
    </ToolInlineRow>
  );
}

function EditFileCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const path = asString(input?.path) || "file.txt";
  const value = asString(input?.new_content) || "";
  const replacedContent = asString(output?.replaced_content) || "";
  const targetRange =
    [asNumber(input?.start_line), asNumber(input?.end_line)].every((v) => v !== null)
      ? `${input?.start_line}-${input?.end_line}`
      : null;
  return (
    <ToolInlineRow
      icon={<IconFileText className="h-4 w-4" />}
      title="Edit File"
      subtitle={path}
      badge={<StatusBadge content={content} />}
    >
      {!replacedContent && targetRange ? (
        <div className="text-xs text-muted-foreground/65">
          Replaced lines {targetRange}
        </div>
      ) : null}
      <DiffEditorPane before={replacedContent} after={value} />
    </ToolInlineRow>
  );
}

function ExecuteCommandCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  return (
    <ToolInlineRow
      icon={<IconTerminal2 className="h-4 w-4" />}
      title="Execute Command"
      badge={<StatusBadge content={content} />}
    >
      <CommandBlock
        command={asString(input?.command) || ""}
        stdout={asString(output?.stdout)}
        stderr={asString(output?.stderr)}
      />
    </ToolInlineRow>
  );
}

function ReadImageCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  return (
    <InlineEventRow
      icon={<IconPhotoSearch className="h-3.5 w-3.5" />}
      title={asString(input?.path) || "Read image"}
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground/78">
        {[asString(output?.mime_type), asNumber(output?.size_bytes) !== null ? `${output?.size_bytes} bytes` : null]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </InlineEventRow>
  );
}

function SleepCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  return (
    <InlineEventRow
      icon={<IconMoon className="h-3.5 w-3.5" />}
      title="Sleep"
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground/78">
        {[
          asNumber(output?.slept_ms) !== null
            ? `Paused for ${output?.slept_ms} ms`
            : asNumber(input?.duration_ms) !== null
              ? `Pause requested for ${input?.duration_ms} ms`
              : "Paused",
          asString(input?.reason),
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </InlineEventRow>
  );
}

function SnapshotCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  return (
    <InlineEventRow
      icon={<IconClock className="h-3.5 w-3.5" />}
      title="Snapshot Execution State"
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground/78">
        {asString(input?.reason) || "Checkpoint saved for the current run."}
      </div>
    </InlineEventRow>
  );
}

function WebSearchCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const queries = asArray(input?.search_queries).filter(
    (query): query is string => typeof query === "string" && query.trim().length > 0,
  );
  return (
    <ToolInlineRow
      icon={<IconWorldSearch className="h-4 w-4" />}
      title="Web Search"
      subtitle={asString(input?.objective)}
      badge={<StatusBadge content={content} />}
    >
      {queries.length > 0 ? (
        <div className="text-sm leading-6 text-foreground/78">
          {queries.join(", ")}
        </div>
      ) : null}
      <SearchResultsList results={asArray(output?.results)} />
    </ToolInlineRow>
  );
}

function UrlContentCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const urls = asArray(input?.urls).filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );
  return (
    <ToolInlineRow
      icon={<IconWorldSearch className="h-4 w-4" />}
      title="Fetch URL Content"
      subtitle={asString(input?.objective)}
      badge={<StatusBadge content={content} />}
    >
      {urls.length > 0 ? (
        <div className="space-y-1 text-sm leading-6 text-foreground/78">
          {urls.slice(0, 4).map((url) => (
            <div key={url} className="break-all">
              {url}
            </div>
          ))}
        </div>
      ) : null}
      <SearchResultsList results={asArray(output?.results)} />
    </ToolInlineRow>
  );
}

function KnowledgeSearchCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const hints = toolOutputData(content);
  return (
    <ToolInlineRow
      icon={<IconDatabaseSearch className="h-4 w-4" />}
      title="Search Knowledge Base"
      subtitle={asString(input?.query)}
      badge={<StatusBadge content={content} />}
    >
      {asString(hints?.search_summary) ? (
        <div className="border-l-2 border-border/45 pl-3 text-sm leading-6 text-foreground/78">
          {hints?.search_summary as string}
        </div>
      ) : null}
      {!asString(hints?.search_summary) && asString(hints?.search_conclusion) ? (
        <div className="text-sm leading-6 text-foreground/78">
          {formatLabel(asString(hints?.search_conclusion) || "")}
        </div>
      ) : null}
      <SearchResultsList results={asArray(hints?.recommended_files)} />
    </ToolInlineRow>
  );
}

function CreateProjectTaskCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const taskKey = asString(output?.task_key) || asString(output?.created_task_key);
  return (
    <ToolInlineRow
      icon={<IconListDetails className="h-4 w-4" />}
      title={asString(input?.title) || "Create Project Task"}
      subtitle={asString(input?.description)}
      badge={<StatusBadge content={content} />}
    >
      {taskKey ? (
        <div className="text-sm leading-6 text-foreground/78">{taskKey}</div>
      ) : null}
    </ToolInlineRow>
  );
}

function ListThreadsCard({ content }: { content: ToolResultContent }) {
  const output = toolOutputData(content);
  return (
    <ToolInlineRow
      icon={<IconListDetails className="h-4 w-4" />}
      title="List Threads"
      badge={<StatusBadge content={content} />}
    >
      <ThreadList threads={asArray(output?.threads)} />
    </ToolInlineRow>
  );
}

function TaskGraphCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const node = asRecord(output?.node);
  const graph = asRecord(output?.graph);

  const titleMap: Record<string, string> = {
    task_graph_add_node: "Task Graph: Add Node",
    task_graph_add_dependency: "Task Graph: Add Dependency",
    task_graph_mark_in_progress: "Task Graph: Mark In Progress",
    task_graph_complete_node: "Task Graph: Complete Node",
    task_graph_fail_node: "Task Graph: Fail Node",
    task_graph_mark_completed: "Task Graph: Mark Completed",
    task_graph_mark_failed: "Task Graph: Mark Failed",
  };

  return (
    <InlineEventRow
      icon={<IconGitBranch className="h-3.5 w-3.5" />}
      title={titleMap[content.tool_name] || "Task graph"}
      meta={<StatusBadge content={content} />}
    >
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/75">
        {asString(output?.graph_id) || asString(graph?.id) || asString(output?.created_graph_id) ? (
          <span>Graph {asString(output?.graph_id) || asString(graph?.id) || asString(output?.created_graph_id)}</span>
        ) : null}
        {asString(output?.created_node_id) || asString(input?.node_id) || asString(node?.id) ? (
          <span>Node {asString(output?.created_node_id) || asString(input?.node_id) || asString(node?.id)}</span>
        ) : null}
        {asString(node?.status) || asString(graph?.status) ? (
          <span>Status {asString(node?.status) || asString(graph?.status)}</span>
        ) : null}
        {asString(input?.handoff_file_path) || asString(input?.handoff_path) || asString(output?.handoff_path) ? (
          <span>{asString(input?.handoff_file_path) || asString(input?.handoff_path) || asString(output?.handoff_path)}</span>
        ) : null}
      </div>
      {asString(input?.title) || asString(node?.title) ? (
        <div className="text-sm text-foreground/82">
          {asString(input?.title) || asString(node?.title)}
        </div>
      ) : null}
      {asString(input?.description) || asString(input?.reason) ? (
        <div className="text-sm leading-6 text-muted-foreground/80">
          {asString(input?.description) || asString(input?.reason)}
        </div>
      ) : null}
    </InlineEventRow>
  );
}

function SearchToolsCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const results = asArray(output?.results);
  return (
    <ToolInlineRow
      icon={<IconSearch className="h-4 w-4" />}
      title="Search Tools"
      badge={<StatusBadge content={content} />}
    >
      <MetaList
        items={[
          { label: "Queries", value: asArray(input?.queries).length },
          { label: "Matches", value: results.length },
        ]}
      />
      {asArray(input?.queries).length > 0 ? (
        <div className="text-sm leading-6 text-foreground/78">
          {(asArray(input?.queries).filter((item): item is string => typeof item === "string")).join(", ")}
        </div>
      ) : null}
      <SearchResultsList results={results} />
    </ToolInlineRow>
  );
}

function LoadToolsCard({ content }: { content: ToolResultContent }) {
  const output = toolOutputData(content);
  const input = asRecord(content.input);
  const toolNames =
    asArray(output?.loaded_tool_names).length > 0
      ? asArray(output?.loaded_tool_names)
      : asArray(input?.tool_names);
  return (
    <ToolInlineRow
      icon={<IconTool className="h-4 w-4" />}
      title="Load Tools"
      badge={<StatusBadge content={content} />}
    >
      {toolNames.length > 0 ? (
        <div className="text-sm leading-6 text-foreground/78">
          {toolNames.filter((item): item is string => typeof item === "string").join(", ")}
        </div>
      ) : null}
    </ToolInlineRow>
  );
}

function LoadMemoryCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const results = asArray(output?.results);
  return (
    <ToolInlineRow
      icon={<IconBrain className="h-4 w-4" />}
      title="Load Memory"
      subtitle={asString(input?.query)}
      badge={<StatusBadge content={content} />}
    >
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.slice(0, 6).map((item, index) => {
            const record = asRecord(item);
            if (!record) return null;
            return (
              <div key={`memory-${index}`} className="text-sm leading-6 text-foreground/78">
                {asString(record.content) || asString(record.summary) || asString(record.text) || `Memory ${index + 1}`}
              </div>
            );
          })}
        </div>
      ) : null}
    </ToolInlineRow>
  );
}

function SaveMemoryCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  return (
    <ToolInlineRow
      icon={<IconBrain className="h-4 w-4" />}
      title="Save Memory"
      badge={<StatusBadge content={content} />}
    >
      {asString(input?.content) ? (
        <div className="text-sm leading-6 text-foreground/78">{input?.content as string}</div>
      ) : null}
    </ToolInlineRow>
  );
}

function DecisionReasonRow({
  content,
}: {
  content: SystemDecisionContent;
}) {
  const meta = getDecisionStepMeta(content.step);
  return (
    <InlineEventRow
      icon={meta.icon}
      title={meta.label}
      meta={
        <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[11px] text-foreground/70">
          {Math.round(content.confidence * 100)}%
        </span>
      }
    >
      <div className="text-sm leading-6 text-foreground/82">
        {content.reasoning}
      </div>
    </InlineEventRow>
  );
}

export function ToolResultEventCard({ content }: { content: ToolResultContent }) {
  switch (content.tool_name) {
    case "read_file":
      return <ReadFileCard content={content} />;
    case "write_file":
      return <WriteFileCard content={content} />;
    case "edit_file":
      return <EditFileCard content={content} />;
    case "execute_command":
      return <ExecuteCommandCard content={content} />;
    case "read_image":
      return <ReadImageCard content={content} />;
    case "sleep":
      return <SleepCard content={content} />;
    case "snapshot_execution_state":
      return <SnapshotCard content={content} />;
    case "web_search":
      return <WebSearchCard content={content} />;
    case "url_content":
      return <UrlContentCard content={content} />;
    case "search_knowledgebase":
      return <KnowledgeSearchCard content={content} />;
    case "search_tools":
      return <SearchToolsCard content={content} />;
    case "load_tools":
      return <LoadToolsCard content={content} />;
    case "load_memory":
      return <LoadMemoryCard content={content} />;
    case "save_memory":
      return <SaveMemoryCard content={content} />;
    case "create_project_task":
      return <CreateProjectTaskCard content={content} />;
    case "list_threads":
      return <ListThreadsCard content={content} />;
    case "task_graph_add_node":
    case "task_graph_add_dependency":
    case "task_graph_mark_in_progress":
    case "task_graph_complete_node":
    case "task_graph_fail_node":
    case "task_graph_mark_completed":
    case "task_graph_mark_failed":
      return <TaskGraphCard content={content} />;
    default:
      return <UnknownToolCard content={content} />;
  }
}

export function SystemDecisionEventCard({
  content,
}: {
  content: SystemDecisionContent;
}) {
  return <DecisionReasonRow content={content} />;
}
