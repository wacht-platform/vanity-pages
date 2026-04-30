import type {
  ApprovalRequestContent,
  ConversationAttachment as ResponseAttachment,
  ConversationContent,
  FileData,
  ProjectTaskWorkspaceFileContent,
  SteerContent,
  ToolApprovalDecision,
  UserMessageContent,
} from "@wacht/types";

export type ApprovalChoice = ToolApprovalDecision["mode"] | "deny";

export type ChatWorkspaceSelection =
  | { kind: "file"; path: string }
  | { kind: "dir"; path: string }
  | null;

export type ThreadFilesystemFileContent = ProjectTaskWorkspaceFileContent & {
  blob: Blob;
};

export type ChatPreviewFile = {
  url: string;
  name: string;
  mimeType: string;
};

export function getFilesystemPaneBounds(containerWidth: number) {
  const minWidth = Math.min(420, Math.max(300, Math.floor(containerWidth * 0.32)));
  const maxWidth = Math.max(minWidth, Math.min(920, Math.floor(containerWidth * 0.68)));
  return { minWidth, maxWidth };
}

export function getDefaultFilesystemPaneWidth(containerWidth: number) {
  const { minWidth, maxWidth } = getFilesystemPaneBounds(containerWidth);
  const targetWidth = Math.round(containerWidth * 0.4);
  return Math.min(Math.max(targetWidth, minWidth), maxWidth);
}

export function clampFilesystemPaneWidth(width: number, containerWidth: number) {
  const { minWidth, maxWidth } = getFilesystemPaneBounds(containerWidth);
  return Math.min(Math.max(width, minWidth), maxWidth);
}

export function normalizeThreadWorkspacePath(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "/workspace" || trimmed === "/workspace/") return "workspace";
  if (trimmed === "/uploads" || trimmed === "/uploads/") return "uploads";
  if (trimmed.startsWith("/workspace/")) {
    return `workspace/${trimmed.slice("/workspace/".length)}`;
  }
  if (trimmed.startsWith("/uploads/")) {
    return `uploads/${trimmed.slice("/uploads/".length)}`;
  }
  return trimmed.replace(/^\/+/, "");
}

export function dirname(path: string) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (!normalized.includes("/")) return "";
  return normalized.slice(0, normalized.lastIndexOf("/"));
}

export function getPathAncestors(path: string) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (!normalized) return [];
  const parts = normalized.split("/").filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function isMarkdownFile(path?: string) {
  return !!path && /\.(md|mdx|markdown)$/i.test(path);
}

export function isImageMimeType(mimeType?: string) {
  return !!mimeType && mimeType.startsWith("image/");
}

export function isDocxFile(path?: string, mimeType?: string) {
  return (
    !!path && /\.docx$/i.test(path)
  ) || (mimeType || "").toLowerCase().includes("wordprocessingml");
}

export function isPptxFile(path?: string, mimeType?: string) {
  return (
    !!path && /\.pptx$/i.test(path)
  ) || (mimeType || "").toLowerCase().includes("presentationml");
}

export function isPdfFile(path?: string, mimeType?: string) {
  return (
    !!path && /\.pdf$/i.test(path)
  ) || (mimeType || "").toLowerCase().includes("pdf");
}

export function isCsvFile(path?: string, mimeType?: string) {
  const normalizedMime = (mimeType || "").toLowerCase();
  return (
    !!path && /\.(csv|tsv)$/i.test(path)
  ) || normalizedMime.includes("csv") || normalizedMime.includes("tab-separated-values");
}

const NON_TEXT_PREVIEW_EXTENSIONS = new Set([
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "pdf",
  "zip",
  "gz",
  "tar",
  "7z",
  "rar",
  "jar",
  "war",
  "bin",
  "exe",
  "dll",
  "so",
  "dylib",
  "class",
]);

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "md",
  "mdx",
  "markdown",
  "json",
  "jsonc",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mts",
  "cts",
  "mjs",
  "cjs",
  "py",
  "rb",
  "php",
  "java",
  "kt",
  "kts",
  "go",
  "rs",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hpp",
  "m",
  "mm",
  "swift",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "sql",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "xml",
  "svg",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "env",
  "log",
]);

function fileExtension(path?: string) {
  if (!path) return "";
  const name = path.split("/").pop() || path;
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function isPreviewableTextFile(path?: string, mimeType?: string) {
  const ext = fileExtension(path);
  const normalizedMime = (mimeType || "").toLowerCase();

  if (NON_TEXT_PREVIEW_EXTENSIONS.has(ext)) return false;
  if (TEXT_PREVIEW_EXTENSIONS.has(ext)) return true;

  return (
    normalizedMime.startsWith("text/") ||
    normalizedMime.includes("json") ||
    normalizedMime.includes("javascript") ||
    normalizedMime.includes("typescript") ||
    normalizedMime.includes("python") ||
    normalizedMime.includes("xml") ||
    normalizedMime.includes("yaml")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNoteToolResult(content: ConversationContent): boolean {
  if (content.type !== "tool_result") return false;
  if (content.tool_name === "note") return true;

  const output = isRecord(content.output) ? content.output : null;
  return output?.tool_name === "note";
}

export function isNoteMessage(content: ConversationContent): boolean {
  return (
    isNoteToolResult(content) ||
    (content.type === "system_decision" && content.step === "note")
  );
}

function getNoteToolMessage(content: { input: unknown }): string {
  const input = isRecord(content.input) ? content.input : null;
  const entry = input?.entry;
  return typeof entry === "string" && entry.trim()
    ? entry.trim()
    : "Recorded a note.";
}

export function getDisplayContent(content: ConversationContent): string {
  switch (content.type) {
    case "user_message":
      return (content as UserMessageContent).message;
    case "steer":
      return (content as SteerContent).message;
    case "tool_result":
      if (isNoteToolResult(content)) {
        return getNoteToolMessage(content);
      }
      return content.tool_name;
    case "approval_request":
      return (content as ApprovalRequestContent).description;
    case "approval_response":
      return "";
    case "system_decision":
      return content.reasoning;
    default:
      return JSON.stringify(content, null, 2);
  }
}

export function getMessageFiles(content: ConversationContent): FileData[] {
  if (content.type !== "user_message") return [];
  const files = (content as UserMessageContent).files;
  return Array.isArray(files) ? files : [];
}

export function getResponseAttachments(content: ConversationContent): ResponseAttachment[] {
  if (content.type === "steer") {
    const attachments = (content as SteerContent).attachments;
    return Array.isArray(attachments) ? attachments : [];
  }
  return [];
}

export function messageDisplayKind(content: ConversationContent): "user" | "agent" | "system" {
  switch (content.type) {
    case "user_message":
      return "user";
    case "system_decision":
    case "approval_request":
    case "execution_summary":
      return "system";
    default:
      return "agent";
  }
}

export function isEventStyleMessage(content: ConversationContent): boolean {
  if (isNoteMessage(content)) return false;

  return (
    content.type === "system_decision" ||
    content.type === "tool_result" ||
    content.type === "approval_request" ||
    content.type === "approval_response" ||
    content.type === "execution_summary"
  );
}

export function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = sizeBytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatAttachmentLabel(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "Attachment";
  const normalized = trimmed.replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return (
      date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
