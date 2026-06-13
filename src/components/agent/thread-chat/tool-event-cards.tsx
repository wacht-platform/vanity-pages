"use client";

import * as React from "react";
import {
  IconBrain,
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
} from "@tabler/icons-react";

import type { SystemDecisionContent, ToolResultContent } from "@wacht/types";

import {
  getDecisionStepMeta,
  InlineEventRow,
  InlineStatusBadge,
  type TraceNodeStatus,
} from "./event-row";
import { LazyCodeFileViewer } from "./lazy-code-file-viewer";
import { ToolDetailSection } from "./structured-value";
import { JsonViewer } from "@/components/json-viewer";

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
  // An explicit error status, OR an error in the result/output envelope (e.g. a
  // tool that "completed" the call but returned an error like HTTP 403), counts
  // as a failure — otherwise an errored tool would show as success.
  if (content.status === "error" || content.status === "failed") return "failed";
  if (toolOutputError(content)) return "failed";
  if (content.status === "success" || content.status === "completed") return "completed";
  return "pending";
}

function toolNode(content: ToolResultContent): TraceNodeStatus {
  const status = toolStatus(content);
  if (status === "completed") return "ok";
  if (status === "failed") return "err";
  return "run";
}

function toolOutputEnvelope(content: ToolResultContent) {
  return asRecord(content.output);
}

function toolOutputData(content: ToolResultContent) {
  const envelope = toolOutputEnvelope(content);
  return asRecord(envelope?.data) ?? envelope;
}

function toolOutputError(content: ToolResultContent) {
  const envelope = toolOutputEnvelope(content);
  const envelopeError = envelope?.error;
  if (typeof content.error === "string" && content.error.trim()) {
    return content.error.trim();
  }
  if (typeof envelopeError === "string" && envelopeError.trim()) {
    return envelopeError.trim();
  }
  if (isObjectRecord(envelopeError)) {
    return asString(envelopeError.message) ?? JSON.stringify(envelopeError);
  }
  return null;
}

function StatusBadge({ content }: { content: ToolResultContent }) {
  const status = toolStatus(content);
  return (
    <InlineStatusBadge
      status={status}
      label={status === "failed" ? "error" : formatLabel(content.status)}
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
    <div className="flex flex-wrap gap-4 font-mono text-[11px] leading-[1.5] text-muted-foreground">
      {visible.map((item) => (
        <span key={item.label}>
          <b className="font-medium text-foreground-secondary">{item.label}</b>{" "}
          {item.value}
        </span>
      ))}
    </div>
  );
}

function ToolInlineRow({
  icon,
  title,
  subtitle,
  badge,
  content,
  kind,
  primaryIcon,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  content?: ToolResultContent;
  kind?: string;
  primaryIcon?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <InlineEventRow
      icon={icon}
      title={title}
      kind={kind ?? content?.tool_name}
      node={content ? toolNode(content) : "idle"}
      primaryIcon={primaryIcon}
      meta={badge}
      defaultOpen={defaultOpen}
    >
      {subtitle ? (
        <div className="font-mono text-[11px] leading-[1.5] text-muted-foreground">
          {subtitle}
        </div>
      ) : null}
      {children}
    </InlineEventRow>
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
    <div className="overflow-auto rounded-[6px] border border-border bg-canvas px-3.5 py-[11px] font-mono text-[12px] leading-[1.7]">
      <div className="text-foreground">
        <span className="select-none text-primary">$ </span>
        <span className="break-all">{command}</span>
      </div>
      {stdout ? (
        <pre className="whitespace-pre-wrap break-words text-muted-foreground">{stdout}</pre>
      ) : null}
      {stderr ? (
        <pre className="whitespace-pre-wrap break-words text-error">{stderr}</pre>
      ) : null}
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
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Diff
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-mono text-[12px] leading-6">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="w-12 px-2 py-2 text-right font-medium">Old</th>
              <th className="w-6 px-1 py-2 text-center font-medium" />
              <th className="border-r border-border px-3 py-2 text-left font-medium">
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
                  ? "border-l-2 border-error/60 bg-error-soft text-error"
                  : "border-l-2 border-transparent text-foreground";
              const rightCellTone =
                row.kind === "insert"
                  ? "border-l-2 border-success/60 bg-success-soft text-success"
                  : "border-l-2 border-transparent text-foreground";
              const leftMarker = row.kind === "delete" ? "-" : "";
              const rightMarker = row.kind === "insert" ? "+" : "";

              return (
                <tr key={`diff-${index}`} className="border-b border-border align-top">
                  <td className="select-none px-2 py-1 text-right text-muted-foreground">
                    {row.leftLineNumber ?? ""}
                  </td>
                  <td className={`select-none px-1 py-1 text-center ${row.kind === "delete" ? "text-error" : "text-muted-foreground/70"}`}>
                    {leftMarker}
                  </td>
                  <td className={`border-r border-border px-3 py-1 whitespace-pre-wrap break-words ${leftCellTone}`}>
                    {row.leftText || " "}
                  </td>
                  <td className="select-none px-2 py-1 text-right text-muted-foreground">
                    {row.rightLineNumber ?? ""}
                  </td>
                  <td className={`select-none px-1 py-1 text-center ${row.kind === "insert" ? "text-success" : "text-muted-foreground/70"}`}>
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
          className="border-l-2 border-border pl-3"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="text-sm font-medium text-foreground">
              {asString(item.title) ||
                asString(item.document_title) ||
                asString(item.path) ||
                `Result ${index + 1}`}
            </div>
            {asString(item.url) ? (
              <div className="min-w-0 break-all text-xs text-muted-foreground">
                {item.url as string}
              </div>
            ) : null}
          </div>
          {asString(item.excerpt) || asString(item.sample_text) ? (
            <div className="mt-2 text-sm leading-6 text-foreground">
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
          className="border-l-2 border-border pl-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {asString(thread.title) || "Untitled thread"}
            </span>
            {asString(thread.thread_purpose) ? (
              <span className="rounded-full bg-accent/70 px-2 py-0.5 text-[11px] text-foreground">
                {thread.thread_purpose as string}
              </span>
            ) : null}
            {asString(thread.status) ? (
              <span className="rounded-full bg-accent/70 px-2 py-0.5 text-[11px] text-foreground">
                {thread.status as string}
              </span>
            ) : null}
          </div>
          {asString(thread.responsibility) ? (
            <div className="mt-2 text-sm leading-6 text-foreground">
              {thread.responsibility as string}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function UnknownToolCard({ content }: { content: ToolResultContent }) {
  const output = toolOutputData(content);
  return (
    <ToolInlineRow
      icon={<IconTool className="h-4 w-4" />}
      title={formatLabel(content.tool_name)}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      <CollapsibleJsonSection label="Input" data={content.input} />
      <CollapsibleJsonSection label="Output" data={output} />
    </ToolInlineRow>
  );
}

function CollapsibleJsonSection({ label, data }: { label: string; data: unknown }) {
  if (data === undefined || data === null) return null;
  if (typeof data === "object" && data !== null && Object.keys(data as object).length === 0) {
    return null;
  }
  return (
    <details className="group rounded-[6px] border border-border bg-card">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
        <span>{label}</span>
      </summary>
      <div className="border-t border-border px-[18px] py-3.5">
        <JsonViewer data={data} />
      </div>
    </details>
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
      content={content}
    >
      {requestedRange ? (
        <div className="text-xs text-muted-foreground">Lines {requestedRange}</div>
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
  const isAppend = content.tool_name === "append_file" || input?.append === true;
  return (
    <ToolInlineRow
      icon={<IconFilePlus className="h-4 w-4" />}
      title={isAppend ? "Append File" : "Write File"}
      subtitle={path}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      <LazyCodeFileViewer path={path} value={value} />
    </ToolInlineRow>
  );
}

function EditFileCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const path = asString(input?.path) || "file.txt";
  const oldString = asString(input?.old_string) || "";
  const newString = asString(input?.new_string) || "";
  const replaceAll = input?.replace_all === true;
  const replacements = asNumber(output?.replacements);
  const totalLines = asNumber(output?.total_lines);
  const meta = [
    replacements !== null
      ? `${replacements} ${replacements === 1 ? "replacement" : "replacements"}`
      : null,
    replaceAll ? "replace_all" : null,
    totalLines !== null ? `${totalLines} lines` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ToolInlineRow
      icon={<IconFileText className="h-4 w-4" />}
      title="Edit File"
      subtitle={path}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      {meta ? (
        <div className="text-xs text-muted-foreground">{meta}</div>
      ) : null}
      <DiffEditorPane before={oldString} after={newString} />
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
      content={content}
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
      kind={content.tool_name}
      node={toolNode(content)}
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground">
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
      kind={content.tool_name}
      node={toolNode(content)}
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground">
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
  return (
    <InlineEventRow
      icon={<IconClock className="h-3.5 w-3.5" />}
      title="Snapshot Execution State"
      kind={content.tool_name}
      node={toolNode(content)}
      meta={<StatusBadge content={content} />}
    >
      <div className="text-sm leading-6 text-foreground">
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
      content={content}
    >
      {queries.length > 0 ? (
        <div className="text-sm leading-6 text-foreground">
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
      content={content}
    >
      {urls.length > 0 ? (
        <div className="space-y-1 text-sm leading-6 text-foreground">
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
      content={content}
    >
      {asString(hints?.search_summary) ? (
        <div className="border-l-2 border-border pl-3 text-sm leading-6 text-foreground">
          {hints?.search_summary as string}
        </div>
      ) : null}
      {!asString(hints?.search_summary) && asString(hints?.search_conclusion) ? (
        <div className="text-sm leading-6 text-foreground">
          {formatLabel(asString(hints?.search_conclusion) || "")}
        </div>
      ) : null}
      <SearchResultsList results={asArray(hints?.recommended_files)} />
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
      content={content}
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
    task_graph_reset: "Task Graph: Reset",
  };

  return (
    <InlineEventRow
      icon={<IconGitBranch className="h-3.5 w-3.5" />}
      title={titleMap[content.tool_name] || "Task graph"}
      kind={content.tool_name}
      node={toolNode(content)}
      meta={<StatusBadge content={content} />}
    >
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
        <div className="text-sm text-foreground">
          {asString(input?.title) || asString(node?.title)}
        </div>
      ) : null}
      {asString(input?.description) || asString(input?.reason) ? (
        <div className="text-sm leading-6 text-muted-foreground">
          {asString(input?.description) || asString(input?.reason)}
        </div>
      ) : null}
    </InlineEventRow>
  );
}

function SearchToolsCard({ content }: { content: ToolResultContent }) {
  return (
    <ToolInlineRow
      icon={<IconSearch className="h-4 w-4" />}
      title="Search Tools"
      badge={<StatusBadge content={content} />}
    />
  );
}

function LoadToolsCard({ content }: { content: ToolResultContent }) {
  return (
    <ToolInlineRow
      icon={<IconTool className="h-4 w-4" />}
      title="Load Tools"
      badge={<StatusBadge content={content} />}
    />
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
      content={content}
    >
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.slice(0, 6).map((item, index) => {
            const record = asRecord(item);
            if (!record) return null;
            return (
              <div key={`memory-${index}`} className="text-sm leading-6 text-foreground">
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
      content={content}
    >
      {asString(input?.content) ? (
        <div className="text-sm leading-6 text-foreground">{input?.content as string}</div>
      ) : null}
    </ToolInlineRow>
  );
}

function UpdateMemoryCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  return (
    <ToolInlineRow
      icon={<IconBrain className="h-4 w-4" />}
      title="Update Memory"
      subtitle={asString(input?.memory_id)}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      {asString(input?.content) ? (
        <div className="text-sm leading-6 text-foreground">{input?.content as string}</div>
      ) : null}
      <MetaList
        items={[
          { label: "Category", value: asString(input?.category) },
          { label: "Scope", value: asString(input?.scope) },
          { label: "Signals", value: asArray(input?.signals).length || null },
          { label: "Related", value: asArray(input?.related).length || null },
        ]}
      />
      <ToolDetailSection label="Output" data={output} />
    </ToolInlineRow>
  );
}

function ProjectTaskMutationCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const titleMap: Record<string, string> = {
    create_project_task: "Create Project Task",
    update_project_task: "Update Project Task",
    assign_project_task: "Assign Project Task",
  };
  const taskKey =
    asString(input?.task_key) ||
    asString(output?.task_key) ||
    asString(output?.created_task_key);

  return (
    <ToolInlineRow
      icon={<IconListDetails className="h-4 w-4" />}
      title={asString(input?.title) || titleMap[content.tool_name] || "Project Task"}
      subtitle={taskKey || asString(input?.description)}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      <MetaList
        items={[
          { label: "Status", value: asString(input?.status) || asString(output?.status) },
          { label: "Priority", value: asString(input?.priority) || asString(output?.priority) },
          { label: "Assignments", value: asArray(input?.assignments).length || null },
          {
            label: "Board item",
            value: asString(output?.board_item_id) || asString(output?.created_board_item_id),
          },
        ]}
      />
      {asString(input?.description) ? (
        <div className="text-sm leading-6 text-foreground">{input?.description as string}</div>
      ) : null}
      <ToolDetailSection label="Schedule" data={input?.schedule} />
      <ToolDetailSection label="Assignments" data={input?.assignments} />
      <ToolDetailSection label="Output" data={output} />
    </ToolInlineRow>
  );
}

function ThreadMutationCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  const output = toolOutputData(content);
  const title = content.tool_name === "create_thread" ? "Create Thread" : "Update Thread";

  return (
    <ToolInlineRow
      icon={<IconGitBranch className="h-4 w-4" />}
      title={asString(input?.title) || title}
      subtitle={asString(input?.thread_id) || asString(output?.thread_id)}
      badge={<StatusBadge content={content} />}
      content={content}
    >
      <MetaList
        items={[
          { label: "Responsibility", value: asString(input?.responsibility) },
          { label: "Agent", value: asString(input?.assigned_agent_name) },
          { label: "Reusable", value: asBoolean(input?.reusable) },
          { label: "Assignments", value: asBoolean(input?.accepts_assignments) },
        ]}
      />
      <ToolDetailSection label="Capability tags" data={input?.capability_tags} />
      <ToolDetailSection label="Metadata" data={input?.metadata} />
      <ToolDetailSection label="Output" data={output} />
    </ToolInlineRow>
  );
}

function AbortTaskCard({ content }: { content: ToolResultContent }) {
  const input = asRecord(content.input);
  return (
    <InlineEventRow
      icon={<IconShieldExclamation className="h-3.5 w-3.5" />}
      title="Abort Task"
      kind={content.tool_name}
      node={toolNode(content)}
      meta={<StatusBadge content={content} />}
      defaultOpen
    >
      <div className="text-sm leading-6 text-foreground">
        {asString(input?.reason) || asString(input?.reasoning) || "Task aborted."}
      </div>
      <MetaList items={[{ label: "Outcome", value: asString(input?.outcome) }]} />
    </InlineEventRow>
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
      kind="decision"
      primaryIcon
      meta={
        <span className="inline-flex h-[22px] w-fit items-center rounded-[4px] border border-border bg-secondary px-2 font-mono text-[11px] font-medium tabular-nums text-foreground-secondary">
          {Math.round(content.confidence * 100)}%
        </span>
      }
    >
      <div className="border-l-2 border-border-strong pl-3 text-[13px] leading-[1.55] text-foreground-secondary">
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
    case "append_file":
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
    case "update_memory":
      return <UpdateMemoryCard content={content} />;
    case "create_project_task":
    case "update_project_task":
    case "assign_project_task":
      return <ProjectTaskMutationCard content={content} />;
    case "list_threads":
      return <ListThreadsCard content={content} />;
    case "create_thread":
    case "update_thread":
      return <ThreadMutationCard content={content} />;
    case "task_graph_add_node":
    case "task_graph_add_dependency":
    case "task_graph_mark_in_progress":
    case "task_graph_complete_node":
    case "task_graph_fail_node":
    case "task_graph_mark_completed":
    case "task_graph_mark_failed":
    case "task_graph_reset":
      return <TaskGraphCard content={content} />;
    case "abort_task":
      return <AbortTaskCard content={content} />;
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
