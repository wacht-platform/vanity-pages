"use client";

import * as React from "react";
import { IconRefresh } from "@tabler/icons-react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FileCode2,
  FileJson,
  FileText as FileTextIcon,
  Folder,
  FolderOpen,
  ImageIcon,
} from "lucide-react";

import type {
  ProjectTaskWorkspaceFileContent,
  ProjectTaskWorkspaceFileEntry,
  ProjectTaskWorkspaceListing,
} from "@wacht/types";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FilePreviewPane } from "./thread-chat/file-preview-pane";
import { dirname, getPathAncestors } from "./thread-chat/shared";

type WorkspaceSelection =
  | { kind: "file"; path: string }
  | { kind: "dir"; path: string }
  | null;

function getFileIcon(entry: ProjectTaskWorkspaceFileEntry) {
  if (entry.is_dir) {
    return null;
  }

  const name = entry.name.toLowerCase();

  if (
    name.endsWith(".ts") ||
    name.endsWith(".tsx") ||
    name.endsWith(".js") ||
    name.endsWith(".jsx") ||
    name.endsWith(".py") ||
    name.endsWith(".rs") ||
    name.endsWith(".go") ||
    name.endsWith(".sql")
  ) {
    return <FileCode2 size={14} className="shrink-0" />;
  }

  if (name.endsWith(".json") || name.endsWith(".jsonc")) {
    return <FileJson size={14} className="shrink-0" />;
  }

  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".gif") ||
    name.endsWith(".webp") ||
    name.endsWith(".svg")
  ) {
    return <ImageIcon size={14} className="shrink-0" />;
  }

  if (
    name.endsWith(".md") ||
    name.endsWith(".txt") ||
    name.endsWith(".yml") ||
    name.endsWith(".yaml")
  ) {
    return <FileTextIcon size={14} className="shrink-0" />;
  }

  return <FileIcon size={14} className="shrink-0" />;
}

function normalizeTaskWorkspacePath(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/task/")) {
    return trimmed.slice("/task/".length);
  }
  if (trimmed.startsWith("/workspace/")) {
    return `workspace/${trimmed.slice("/workspace/".length)}`;
  }
  return trimmed.replace(/^\/+/, "");
}

function FilesystemTree({
  entries,
  depth = 0,
  selection,
  expandedDirs,
  treeEntries,
  treeLoading,
  treeErrors,
  onToggleDirectory,
  onSelectFile,
}: {
  entries: ProjectTaskWorkspaceFileEntry[];
  depth?: number;
  selection: WorkspaceSelection;
  expandedDirs: Set<string>;
  treeEntries: Record<string, ProjectTaskWorkspaceFileEntry[]>;
  treeLoading: Record<string, boolean>;
  treeErrors: Record<string, string | null>;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  return entries.map((entry) => {
    const isDirectory = entry.is_dir;
    const isExpanded = isDirectory && expandedDirs.has(entry.path);
    const isActiveFile = selection?.kind === "file" && selection.path === entry.path;
    const isActiveDirectory = selection?.kind === "dir" && selection.path === entry.path;
    const childEntries = treeEntries[entry.path] || [];
    const childLoading = Boolean(treeLoading[entry.path]);
    const childError = treeErrors[entry.path];

    return (
      <React.Fragment key={entry.path}>
        <button
          type="button"
          onClick={() => {
            if (isDirectory) {
              onToggleDirectory(entry.path);
              return;
            }
            onSelectFile(entry.path);
          }}
          className="w-full text-left"
        >
          <div
            className={cn(
              "group/item relative flex h-7 items-center gap-1.5 px-2 text-sm transition-colors",
              isActiveFile || isActiveDirectory
                ? "bg-accent/65 text-foreground"
                : "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
            )}
            style={{ paddingLeft: `${10 + depth * 12}px` }}
          >
            {isActiveFile || isActiveDirectory ? (
              <span className="absolute bottom-0 left-0 top-0 w-px bg-primary/80" />
            ) : null}
            {isDirectory ? (
              <span className="flex size-3.5 items-center justify-center text-muted-foreground/80">
                {isExpanded ? (
                  <ChevronDown size={12} className="shrink-0" />
                ) : (
                  <ChevronRight size={12} className="shrink-0" />
                )}
              </span>
            ) : (
              <span className="block w-3.5 shrink-0" />
            )}
            <span
              className={cn(
                "flex shrink-0 items-center justify-center",
                isActiveFile || isActiveDirectory
                  ? "text-foreground"
                  : "text-muted-foreground/80 group-hover/item:text-foreground",
              )}
            >
              {isDirectory ? (
                isExpanded ? (
                  <FolderOpen size={14} className="shrink-0" />
                ) : (
                  <Folder size={14} className="shrink-0" />
                )
              ) : (
                getFileIcon(entry)
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
            {isDirectory ? (
              <span className="shrink-0 text-xs text-muted-foreground/70">
                {childLoading ? "…" : ""}
              </span>
            ) : null}
          </div>
        </button>

        {isDirectory && isExpanded ? (
          <div>
            {childLoading ? (
              <div
                className="space-y-1 px-2 py-1.5"
                style={{ paddingLeft: `${30 + depth * 12}px` }}
              >
                <Skeleton className="h-3.5 bg-accent/50" />
                <Skeleton className="h-3.5 bg-accent/50" />
              </div>
            ) : childError ? (
              <div
                className="px-2 py-1.5 text-sm text-destructive"
                style={{ paddingLeft: `${30 + depth * 12}px` }}
              >
                {childError}
              </div>
            ) : childEntries.length > 0 ? (
              <FilesystemTree
                entries={childEntries}
                depth={depth + 1}
                selection={selection}
                expandedDirs={expandedDirs}
                treeEntries={treeEntries}
                treeLoading={treeLoading}
                treeErrors={treeErrors}
                onToggleDirectory={onToggleDirectory}
                onSelectFile={onSelectFile}
              />
            ) : (
              <div
                className="px-2 py-1.5 text-sm text-muted-foreground"
                style={{ paddingLeft: `${30 + depth * 12}px` }}
              >
                Empty folder
              </div>
            )}
          </div>
        ) : null}
      </React.Fragment>
    );
  });
}

export function TaskWorkspaceExplorer({
  rootEntries,
  rootLoading,
  rootError,
  getFile,
  listDirectory,
  refetchRoot,
  requestedPath,
}: {
  rootEntries: ProjectTaskWorkspaceFileEntry[];
  rootLoading: boolean;
  rootError: string | null;
  getFile: (path: string) => Promise<ProjectTaskWorkspaceFileContent>;
  listDirectory: (path?: string) => Promise<ProjectTaskWorkspaceListing>;
  refetchRoot: () => Promise<void>;
  requestedPath?: string | null;
}) {
  const [selection, setSelection] = React.useState<WorkspaceSelection>(null);
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(new Set());
  const [treeEntries, setTreeEntries] = React.useState<Record<string, ProjectTaskWorkspaceFileEntry[]>>({});
  const [treeLoading, setTreeLoading] = React.useState<Record<string, boolean>>({});
  const [treeErrors, setTreeErrors] = React.useState<Record<string, string | null>>({});
  const [selectedFile, setSelectedFile] = React.useState<ProjectTaskWorkspaceFileContent | null>(null);
  const [selectedFileLoading, setSelectedFileLoading] = React.useState(false);
  const [selectedFileError, setSelectedFileError] = React.useState<string | null>(null);
  const [selectedFileRefreshNonce, setSelectedFileRefreshNonce] = React.useState(0);
  const getFileRef = React.useRef(getFile);

  React.useEffect(() => {
    getFileRef.current = getFile;
  }, [getFile]);

  React.useEffect(() => {
    setTreeEntries((current) => ({
      ...current,
      "": rootEntries,
    }));
    setTreeErrors((current) => ({
      ...current,
      "": rootError,
    }));
    setTreeLoading((current) => ({
      ...current,
      "": rootLoading,
    }));
  }, [rootEntries, rootError, rootLoading]);

  const loadDirectory = React.useCallback(
    async (path: string, force = false) => {
      if (path === "") {
        if (force) {
          await refetchRoot();
        }
        return rootEntries;
      }

      if (!force && treeEntries[path] !== undefined) {
        return treeEntries[path];
      }

      setTreeLoading((current) => ({ ...current, [path]: true }));
      setTreeErrors((current) => ({ ...current, [path]: null }));

      try {
        const listing = await listDirectory(path);
        const files = listing.files || [];
        setTreeEntries((current) => ({ ...current, [path]: files }));
        return files;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load directory";
        setTreeErrors((current) => ({ ...current, [path]: message }));
        setTreeEntries((current) => ({ ...current, [path]: [] }));
        throw error;
      } finally {
        setTreeLoading((current) => ({ ...current, [path]: false }));
      }
    },
    [listDirectory, refetchRoot, rootEntries, treeEntries],
  );

  const openPath = React.useCallback(
    (rawPath: string | null | undefined) => {
      const normalizedPath = normalizeTaskWorkspacePath(rawPath);
      if (!normalizedPath) return;

      const isDirectory = rawPath?.endsWith("/") || normalizedPath === "workspace";
      const directoryPath = isDirectory ? normalizedPath : dirname(normalizedPath);
      const directoriesToExpand = directoryPath ? getPathAncestors(directoryPath) : [];

      setExpandedDirs((current) => {
        const next = new Set(current);
        directoriesToExpand.forEach((entry) => next.add(entry));
        return next;
      });
      setSelection({ kind: isDirectory ? "dir" : "file", path: normalizedPath });

      void (async () => {
        for (const entry of directoriesToExpand) {
          try {
            await loadDirectory(entry);
          } catch {
            break;
          }
        }
      })();
    },
    [loadDirectory],
  );

  React.useEffect(() => {
    if (!requestedPath) return;
    openPath(requestedPath);
  }, [openPath, requestedPath]);

  const toggleDirectory = React.useCallback(
    (path: string) => {
      setExpandedDirs((current) => {
        const next = new Set(current);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          void loadDirectory(path);
        }
        return next;
      });
      setSelection({ kind: "dir", path });
    },
    [loadDirectory],
  );

  const selectedFilePath = selection?.kind === "file" ? selection.path : null;

  React.useEffect(() => {
    if (!selectedFilePath) {
      setSelectedFile(null);
      setSelectedFileLoading(false);
      setSelectedFileError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSelectedFileLoading(true);
      setSelectedFileError(null);
      try {
        const data = await getFileRef.current(selectedFilePath);
        if (cancelled) return;
        setSelectedFile(data);
      } catch (error) {
        if (cancelled) return;
        setSelectedFile(null);
        setSelectedFileError(error instanceof Error ? error.message : "Failed to load file");
      } finally {
        if (!cancelled) {
          setSelectedFileLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, selectedFileRefreshNonce]);

  const handleRefresh = React.useCallback(async () => {
    await refetchRoot();
    setTreeEntries({});
    setTreeErrors({});
    setTreeLoading({});
    if (selection?.kind === "dir") {
      const directoriesToReload = getPathAncestors(selection.path);
      for (const path of directoriesToReload) {
        try {
          await loadDirectory(path, true);
        } catch {
          break;
        }
      }
      await loadDirectory(selection.path, true).catch(() => undefined);
      return;
    }
    if (selection?.kind === "file") {
      const directoriesToReload = getPathAncestors(dirname(selection.path));
      for (const path of directoriesToReload) {
        try {
          await loadDirectory(path, true);
        } catch {
          break;
        }
      }
      setSelectedFileRefreshNonce((value) => value + 1);
    }
  }, [loadDirectory, refetchRoot, selection]);

  const selectedPreviewPath =
    selection?.kind === "file" || selection?.kind === "dir"
      ? selection.path
      : "Preview";

  return (
    <div className="min-h-0 flex-1">
      <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)]">
        <div className="min-h-0 border-r border-border/60">
          <div className="flex h-9 items-center justify-between border-b border-border/60 px-2.5">
            <div className="text-sm text-muted-foreground">workspace</div>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
              onClick={() => void handleRefresh()}
              aria-label="Refresh workspace"
            >
              <IconRefresh className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-[calc(100%-36px)] min-h-0 overflow-y-auto py-1">
            {rootLoading && rootEntries.length === 0 ? (
              <div className="space-y-2 px-2">
                <Skeleton className="h-3.5 bg-accent/50" />
                <Skeleton className="h-3.5 bg-accent/50" />
                <Skeleton className="h-3.5 bg-accent/50" />
              </div>
            ) : rootError && rootEntries.length === 0 ? (
              <div className="px-3 py-4 text-sm text-destructive">{rootError}</div>
            ) : rootEntries.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">No files here.</div>
            ) : (
              <div className="space-y-px">
                <FilesystemTree
                  entries={rootEntries}
                  selection={selection}
                  expandedDirs={expandedDirs}
                  treeEntries={treeEntries}
                  treeLoading={treeLoading}
                  treeErrors={treeErrors}
                  onToggleDirectory={toggleDirectory}
                  onSelectFile={(path) => setSelection({ kind: "file", path })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 min-w-0">
          <div className="flex h-9 items-center justify-between gap-3 border-b border-border/60 px-3">
            <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
              {selectedPreviewPath}
            </div>
            {selectedFile ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {selectedFile.size_bytes > 0 ? `${selectedFile.size_bytes} B` : ""}
              </span>
            ) : null}
              </div>
              <div className="h-[calc(100%-36px)] min-h-0 overflow-y-auto">
                {selectedFileLoading ? (
              <div className="space-y-3 px-3 py-3">
                <Skeleton className="h-4 w-1/3 bg-accent/50" />
                <Skeleton className="h-40 w-full bg-accent/50" />
              </div>
                ) : selectedFile ? (
                  <div className="min-h-full">
                    <FilePreviewPane
                      path={selectedFile.path}
                      mimeType={selectedFile.mime_type}
                      content={selectedFile.content}
                      contentBase64={selectedFile.content_base64}
                      isText={selectedFile.is_text}
                    />
                  </div>
                ) : selectedFileError ? (
              <div className="px-4 py-4 text-sm text-destructive">{selectedFileError}</div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className="text-sm text-foreground">Select a file</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Open a file from the explorer to preview it here.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
