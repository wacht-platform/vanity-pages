import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { ProjectTaskWorkspaceFileEntry } from "@wacht/types";

import {
  clampFilesystemPaneWidth,
  dirname,
  getDefaultFilesystemPaneWidth,
  getPathAncestors,
  isImageMimeType,
  normalizeThreadWorkspacePath,
  type ChatWorkspaceSelection,
  type ThreadFilesystemFileContent,
} from "./shared";

export function useThreadFilesystemPane({
  filesystemEntries,
  filesystemLoading,
  filesystemError,
  getFile,
  listDirectory,
  refetchFilesystem,
  pageShellRef,
}: {
  filesystemEntries: ProjectTaskWorkspaceFileEntry[];
  filesystemLoading: boolean;
  filesystemError: unknown;
  getFile: (path: string) => Promise<ThreadFilesystemFileContent>;
  listDirectory: (path?: string) => Promise<{ files: ProjectTaskWorkspaceFileEntry[] }>;
  refetchFilesystem: () => Promise<void>;
  pageShellRef: RefObject<HTMLDivElement | null>;
}) {
  const [showFilesystem, setShowFilesystem] = useState(false);
  const [filesystemSelection, setFilesystemSelection] =
    useState<ChatWorkspaceSelection>(null);
  const [selectedFilesystemFile, setSelectedFilesystemFile] =
    useState<ThreadFilesystemFileContent | null>(null);
  const [selectedFilesystemFileLoading, setSelectedFilesystemFileLoading] =
    useState(false);
  const [selectedFilesystemFileError, setSelectedFilesystemFileError] =
    useState<string | null>(null);
  const [selectedFilesystemImageUrl, setSelectedFilesystemImageUrl] = useState<string | null>(null);
  const [expandedFilesystemDirs, setExpandedFilesystemDirs] = useState<Set<string>>(
    new Set(),
  );
  const [filesystemTreeEntries, setFilesystemTreeEntries] = useState<
    Record<string, ProjectTaskWorkspaceFileEntry[]>
  >({});
  const [filesystemTreeLoading, setFilesystemTreeLoading] = useState<
    Record<string, boolean>
  >({});
  const [filesystemTreeErrors, setFilesystemTreeErrors] = useState<
    Record<string, string | null>
  >({});
  const [filesystemPaneWidth, setFilesystemPaneWidth] = useState<number | null>(null);
  const [isFilesystemResizing, setIsFilesystemResizing] = useState(false);
  const getFileRef = useRef(getFile);

  useEffect(() => {
    getFileRef.current = getFile;
  }, [getFile]);

  useEffect(() => {
    setFilesystemTreeEntries((current) => ({
      ...current,
      "": filesystemEntries,
    }));
    setFilesystemTreeErrors((current) => ({
      ...current,
      "": filesystemError ? String(filesystemError) : null,
    }));
    setFilesystemTreeLoading((current) => ({
      ...current,
      "": filesystemLoading,
    }));
  }, [filesystemEntries, filesystemError, filesystemLoading]);

  const loadFilesystemDirectory = useCallback(
    async (path: string, force = false) => {
      if (path === "") {
        if (force) {
          await refetchFilesystem();
        }
        return filesystemEntries;
      }

      if (!force && filesystemTreeEntries[path] !== undefined) {
        return filesystemTreeEntries[path];
      }

      setFilesystemTreeLoading((current) => ({
        ...current,
        [path]: true,
      }));
      setFilesystemTreeErrors((current) => ({
        ...current,
        [path]: null,
      }));

      try {
        const listing = await listDirectory(path);
        const files = listing.files || [];
        setFilesystemTreeEntries((current) => ({
          ...current,
          [path]: files,
        }));
        return files;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load directory";
        setFilesystemTreeErrors((current) => ({
          ...current,
          [path]: message,
        }));
        setFilesystemTreeEntries((current) => ({
          ...current,
          [path]: [],
        }));
        throw error;
      } finally {
        setFilesystemTreeLoading((current) => ({
          ...current,
          [path]: false,
        }));
      }
    },
    [filesystemEntries, filesystemTreeEntries, listDirectory, refetchFilesystem],
  );

  const openFilesystemPath = useCallback(
    (path: string | null | undefined) => {
      const normalizedPath = normalizeThreadWorkspacePath(path);
      if (normalizedPath === null) return;

      const isDirectory =
        normalizedPath === "workspace" ||
        normalizedPath === "uploads" ||
        path?.endsWith("/");
      const directoryPath = isDirectory ? normalizedPath : dirname(normalizedPath);
      const directoriesToExpand = directoryPath ? getPathAncestors(directoryPath) : [];

      setShowFilesystem(true);
      setExpandedFilesystemDirs((current) => {
        const next = new Set(current);
        directoriesToExpand.forEach((entry) => next.add(entry));
        return next;
      });
      setFilesystemSelection({
        kind: isDirectory ? "dir" : "file",
        path: normalizedPath,
      });

      void (async () => {
        for (const entry of directoriesToExpand) {
          try {
            await loadFilesystemDirectory(entry);
          } catch {
            break;
          }
        }
      })();
    },
    [loadFilesystemDirectory],
  );

  useEffect(() => {
    if (!showFilesystem) return;

    const containerWidth = pageShellRef.current?.clientWidth ?? window.innerWidth;
    setFilesystemPaneWidth((current) => {
      if (current === null) {
        return getDefaultFilesystemPaneWidth(containerWidth);
      }
      return clampFilesystemPaneWidth(current, containerWidth);
    });
  }, [pageShellRef, showFilesystem]);

  useEffect(() => {
    if (!showFilesystem) return;

    const handleResize = () => {
      const containerWidth = pageShellRef.current?.clientWidth ?? window.innerWidth;
      setFilesystemPaneWidth((current) =>
        clampFilesystemPaneWidth(
          current ?? getDefaultFilesystemPaneWidth(containerWidth),
          containerWidth,
        ),
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pageShellRef, showFilesystem]);

  const startFilesystemResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const shellRect = pageShellRef.current?.getBoundingClientRect();
        if (!shellRect) return;

        setFilesystemPaneWidth(
          clampFilesystemPaneWidth(shellRect.right - moveEvent.clientX, shellRect.width),
        );
      };

      const handlePointerUp = () => {
        setIsFilesystemResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      setIsFilesystemResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [pageShellRef],
  );

  const selectedFilesystemPath =
    filesystemSelection?.kind === "file" ? filesystemSelection.path : null;

  useEffect(() => {
    if (!selectedFilesystemPath) {
      setSelectedFilesystemFile(null);
      setSelectedFilesystemFileLoading(false);
      setSelectedFilesystemFileError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSelectedFilesystemFileLoading(true);
      setSelectedFilesystemFileError(null);

      try {
        const data = await getFileRef.current(selectedFilesystemPath);
        if (cancelled) return;
        setSelectedFilesystemFile(data);
      } catch (error) {
        if (cancelled) return;
        setSelectedFilesystemFile(null);
        setSelectedFilesystemFileError(
          error instanceof Error ? error.message : "Failed to load file",
        );
      } finally {
        if (!cancelled) {
          setSelectedFilesystemFileLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedFilesystemPath]);

  useEffect(() => {
    if (!selectedFilesystemFile || !isImageMimeType(selectedFilesystemFile.mime_type)) {
      setSelectedFilesystemImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFilesystemFile.blob);
    setSelectedFilesystemImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFilesystemFile]);

  const toggleFilesystemDirectory = useCallback(
    (path: string) => {
      const isExpanded = expandedFilesystemDirs.has(path);
      setFilesystemSelection({ kind: "dir", path });
      setExpandedFilesystemDirs((current) => {
        const next = new Set(current);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });

      if (!isExpanded) {
        void loadFilesystemDirectory(path);
      }
    },
    [expandedFilesystemDirs, loadFilesystemDirectory],
  );

  const refreshFilesystemTree = useCallback(() => {
    void (async () => {
      await refetchFilesystem();

      const expanded = Array.from(expandedFilesystemDirs);
      for (const path of expanded) {
        try {
          await loadFilesystemDirectory(path, true);
        } catch {
          break;
        }
      }
    })();
  }, [expandedFilesystemDirs, loadFilesystemDirectory, refetchFilesystem]);

  const downloadSelectedFilesystemFile = useCallback(() => {
    if (!selectedFilesystemFile) return;

    const objectUrl = URL.createObjectURL(selectedFilesystemFile.blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = selectedFilesystemFile.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }, [selectedFilesystemFile]);

  const activeFilesystemPaneWidth = showFilesystem
    ? (filesystemPaneWidth ??
      getDefaultFilesystemPaneWidth(pageShellRef.current?.clientWidth ?? 1280))
    : 0;

  const rootFilesystemError = filesystemError ? String(filesystemError) : null;
  const selectedFilesystemPreviewPath =
    selectedFilesystemFile?.path ||
    (filesystemSelection?.kind === "dir" ? filesystemSelection.path : "Preview");

  return {
    showFilesystem,
    setShowFilesystem,
    isFilesystemResizing,
    activeFilesystemPaneWidth,
    filesystemSelection,
    setFilesystemSelection,
    selectedFilesystemFile,
    selectedFilesystemFileLoading,
    selectedFilesystemFileError,
    selectedFilesystemImageUrl,
    expandedFilesystemDirs,
    filesystemTreeEntries,
    filesystemTreeLoading,
    filesystemTreeErrors,
    rootFilesystemEntries: filesystemEntries,
    rootFilesystemLoading: filesystemLoading,
    rootFilesystemError,
    selectedFilesystemPreviewPath,
    openFilesystemPath,
    toggleFilesystemDirectory,
    refreshFilesystemTree,
    downloadSelectedFilesystemFile,
    startFilesystemResize,
  };
}
