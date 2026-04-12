"use client";

import * as React from "react";
import {
  IconDownload,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
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

import type { ProjectTaskWorkspaceFileEntry } from "@wacht/types";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  type ChatWorkspaceSelection,
  type ThreadFilesystemFileContent,
} from "./shared";
import { FilePreviewPane } from "./file-preview-pane";

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

function FilesystemTree({
  entries,
  depth = 0,
  filesystemSelection,
  expandedFilesystemDirs,
  filesystemTreeEntries,
  filesystemTreeLoading,
  filesystemTreeErrors,
  onToggleDirectory,
  onSelectFile,
}: {
  entries: ProjectTaskWorkspaceFileEntry[];
  depth?: number;
  filesystemSelection: ChatWorkspaceSelection;
  expandedFilesystemDirs: Set<string>;
  filesystemTreeEntries: Record<string, ProjectTaskWorkspaceFileEntry[]>;
  filesystemTreeLoading: Record<string, boolean>;
  filesystemTreeErrors: Record<string, string | null>;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  return entries.map((entry) => {
    const isDirectory = entry.is_dir;
    const isExpanded = isDirectory && expandedFilesystemDirs.has(entry.path);
    const isActiveFile =
      filesystemSelection?.kind === "file" && filesystemSelection.path === entry.path;
    const isActiveDirectory =
      filesystemSelection?.kind === "dir" && filesystemSelection.path === entry.path;
    const childEntries = filesystemTreeEntries[entry.path] || [];
    const childLoading = Boolean(filesystemTreeLoading[entry.path]);
    const childError = filesystemTreeErrors[entry.path];

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
            <span className="min-w-0 flex-1 truncate text-sm">
              {entry.name}
            </span>
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
                filesystemSelection={filesystemSelection}
                expandedFilesystemDirs={expandedFilesystemDirs}
                filesystemTreeEntries={filesystemTreeEntries}
                filesystemTreeLoading={filesystemTreeLoading}
                filesystemTreeErrors={filesystemTreeErrors}
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

export function ThreadFilesystemPane({
  showFilesystem,
  activeFilesystemPaneWidth,
  startFilesystemResize,
  onClose,
  onRefresh,
  filesystemSelection,
  setFilesystemSelection,
  expandedFilesystemDirs,
  filesystemTreeEntries,
  filesystemTreeLoading,
  filesystemTreeErrors,
  rootFilesystemEntries,
  rootFilesystemLoading,
  rootFilesystemError,
  selectedFilesystemPreviewPath,
  selectedFilesystemFileLoading,
  selectedFilesystemFile,
  selectedFilesystemFileError,
  selectedFilesystemImageUrl,
  onToggleDirectory,
  onDownloadSelectedFile,
}: {
  showFilesystem: boolean;
  activeFilesystemPaneWidth: number;
  startFilesystemResize: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onRefresh: () => void;
  filesystemSelection: ChatWorkspaceSelection;
  setFilesystemSelection: React.Dispatch<React.SetStateAction<ChatWorkspaceSelection>>;
  expandedFilesystemDirs: Set<string>;
  filesystemTreeEntries: Record<string, ProjectTaskWorkspaceFileEntry[]>;
  filesystemTreeLoading: Record<string, boolean>;
  filesystemTreeErrors: Record<string, string | null>;
  rootFilesystemEntries: ProjectTaskWorkspaceFileEntry[];
  rootFilesystemLoading: boolean;
  rootFilesystemError: string | null;
  selectedFilesystemPreviewPath: string;
  selectedFilesystemFileLoading: boolean;
  selectedFilesystemFile: ThreadFilesystemFileContent | null;
  selectedFilesystemFileError: string | null;
  selectedFilesystemImageUrl: string | null;
  onToggleDirectory: (path: string) => void;
  onDownloadSelectedFile: () => void;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-background transition-[width] duration-200 ease-out",
        showFilesystem ? "border-l border-border/50" : "border-l border-transparent",
      )}
      style={{ width: `${activeFilesystemPaneWidth}px` }}
    >
      <div
        className={cn(
          "h-full min-w-0 transition-[transform,opacity] duration-200 ease-out",
          showFilesystem
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-8 opacity-0",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-20 w-2 -translate-x-1 cursor-col-resize rounded-full transition-colors hover:bg-border/70",
            !showFilesystem && "pointer-events-none",
          )}
          onPointerDown={startFilesystemResize}
        />
        <div className="flex h-full min-w-0 flex-col">
          <div className="flex h-9 items-center justify-between border-b border-border/60 px-2.5">
            <div className="min-w-0">
              <div className="text-sm font-normal text-foreground">
                Files
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
                onClick={onRefresh}
                aria-label="Refresh filesystem"
              >
                <IconRefresh className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
                onClick={onClose}
                aria-label="Close filesystem"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[248px_minmax(0,1fr)]">
            <div className="min-h-0 border-r border-border/60">
              <div className="border-b border-border/60 px-2.5 py-1.5 text-sm text-muted-foreground">
                workspace
              </div>
              <div className="h-[calc(100%-35px)] min-h-0 overflow-y-auto py-1">
                {rootFilesystemLoading && rootFilesystemEntries.length === 0 ? (
                  <div className="space-y-2 px-2">
                    <Skeleton className="h-3.5 bg-accent/50" />
                    <Skeleton className="h-3.5 bg-accent/50" />
                    <Skeleton className="h-3.5 bg-accent/50" />
                  </div>
                ) : rootFilesystemError && rootFilesystemEntries.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-destructive">
                    {rootFilesystemError}
                  </div>
                ) : rootFilesystemEntries.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    No files here.
                  </div>
                ) : (
                  <div className="space-y-px">
                    <FilesystemTree
                      entries={rootFilesystemEntries}
                      filesystemSelection={filesystemSelection}
                      expandedFilesystemDirs={expandedFilesystemDirs}
                      filesystemTreeEntries={filesystemTreeEntries}
                      filesystemTreeLoading={filesystemTreeLoading}
                      filesystemTreeErrors={filesystemTreeErrors}
                      onToggleDirectory={onToggleDirectory}
                      onSelectFile={(path) =>
                        setFilesystemSelection({ kind: "file", path })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 min-w-0">
              <div className="flex h-9 items-center justify-between gap-3 border-b border-border/60 px-3">
                <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                  {selectedFilesystemPreviewPath}
                </div>
                {selectedFilesystemFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-sm"
                    onClick={onDownloadSelectedFile}
                  >
                    <IconDownload className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Button>
                ) : null}
              </div>
              <div className="h-[calc(100%-36px)] min-h-0 overflow-y-auto">
                {selectedFilesystemFileLoading ? (
                  <div className="space-y-3 px-3 py-3">
                    <Skeleton className="h-4 w-1/3 bg-accent/50" />
                    <Skeleton className="h-40 w-full bg-accent/50" />
                  </div>
                ) : selectedFilesystemFile ? (
                  <div className="min-h-full">
                    <FilePreviewPane
                      path={selectedFilesystemFile.path}
                      mimeType={selectedFilesystemFile.mime_type}
                      content={selectedFilesystemFile.content}
                      isText={selectedFilesystemFile.is_text}
                      imageUrl={selectedFilesystemImageUrl}
                      blob={selectedFilesystemFile.blob}
                    />
                  </div>
                ) : selectedFilesystemFileError ? (
                  <div className="px-4 py-4 text-sm text-destructive">
                    {selectedFilesystemFileError}
                  </div>
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
      </div>
    </div>
  );
}
