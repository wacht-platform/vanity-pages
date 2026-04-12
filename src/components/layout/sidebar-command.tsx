"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActorProjectSearch, useActorThreadSearch } from "@wacht/nextjs";
import type { ActorProject, Agent, AgentThread } from "@wacht/types";
import {
    ClipboardCheck,
    FolderKanban,
    GitBranch,
    LoaderCircle,
    MessageSquare,
    Plus,
    Zap,
} from "lucide-react";

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { CreateProjectDialog } from "@/components/agent/project-dialogs";
import { useActiveAgent } from "../agent-provider";

type SidebarCommandProps = {
    currentProjectId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agents: Agent[];
    onCreateProject: (request: {
        name: string;
        agent_id: string;
        description?: string;
    }) => Promise<ActorProject>;
    projects: ActorProject[];
};

function getThreadLabel(thread: AgentThread) {
    return (
        thread.title ||
        thread.responsibility ||
        `thread-${thread.id.slice(0, 6)}`
    );
}

function getThreadHref(thread: AgentThread) {
    return thread.thread_purpose === "conversation"
        ? `/agents/c/${thread.id}`
        : `/agents/threads/${thread.id}`;
}

function getThreadIcon(thread: AgentThread) {
    switch (thread.thread_purpose) {
        case "conversation":
            return <MessageSquare className="size-4 text-muted-foreground" />;
        case "coordinator":
            return <GitBranch className="size-4 text-muted-foreground" />;
        case "review":
            return <ClipboardCheck className="size-4 text-muted-foreground" />;
        case "execution":
            return <Zap className="size-4 text-muted-foreground" />;
        default:
            return <FolderKanban className="size-4 text-muted-foreground" />;
    }
}

function normalize(value: string) {
    return value.trim().toLowerCase();
}

export function SidebarCommand({
    currentProjectId,
    open,
    onOpenChange,
    agents,
    onCreateProject,
    projects,
}: SidebarCommandProps) {
    const router = useRouter();
    const { hasSession } = useActiveAgent();
    const [query, setQuery] = React.useState("");
    const [isCreateProjectOpen, setIsCreateProjectOpen] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                onOpenChange(!open);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onOpenChange, open]);

    React.useEffect(() => {
        if (open) {
            setQuery("");
        }
    }, [open]);

    const normalizedQuery = normalize(query);
    const currentProject =
        projects.find((project) => project.id === currentProjectId) ?? null;

    const {
        projects: filteredProjects,
        loading: projectsLoading,
    } = useActorProjectSearch({
        enabled: open && hasSession,
        query: normalizedQuery,
        limit: 12,
    });

    const {
        threads: filteredThreads,
        loading: threadsLoading,
    } = useActorThreadSearch({
        enabled: open && hasSession,
        query: normalizedQuery,
        limit: 16,
    });

    const actionProjects = React.useMemo(() => {
        if (normalizedQuery) {
            return filteredProjects.slice(0, 6);
        }
        if (currentProject) {
            return [currentProject];
        }
        return projects.slice(0, 3);
    }, [currentProject, filteredProjects, normalizedQuery, projects]);

    const isSearching = open && (projectsLoading || threadsLoading);
    const showCreateGroup = true;

    const hasResults =
        showCreateGroup ||
        actionProjects.length > 0 ||
        filteredProjects.length > 0 ||
        filteredThreads.length > 0;

    return (
        <>
            <CreateProjectDialog
                agents={agents}
                trigger={null}
                open={isCreateProjectOpen}
                onOpenChange={setIsCreateProjectOpen}
                onCreate={async (request) => {
                    const project = await onCreateProject(request);
                    router.push(`/agents/p/${project.id}/tasks`);
                }}
            />
            <CommandDialog open={open} onOpenChange={onOpenChange}>
                <Command shouldFilter={false}>
                    <CommandInput
                        autoFocus
                        placeholder="Search projects and threads"
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {!hasResults && !isSearching ? (
                            <CommandEmpty>
                                No matching project or thread.
                            </CommandEmpty>
                        ) : null}

                        {showCreateGroup ? (
                            <CommandGroup heading="Create">
                                <CommandItem
                                    value="create-new-project"
                                    keywords={["create", "new", "project"]}
                                    onSelect={() => {
                                        onOpenChange(false);
                                        window.setTimeout(() => {
                                            setIsCreateProjectOpen(true);
                                        }, 0);
                                    }}
                                >
                                    <Plus className="size-4 text-muted-foreground" />
                                    <span>Create project</span>
                                </CommandItem>
                                {actionProjects.map((project: ActorProject) => (
                                    <CommandItem
                                        key={`create-${project.id}`}
                                        value={`create-project-${project.id}`}
                                        keywords={[
                                            "create",
                                            "new",
                                            "thread",
                                            project.name,
                                            project.description || "",
                                        ]}
                                        onSelect={() => {
                                            onOpenChange(false);
                                            router.push(
                                                `/agents/c/new?projectId=${encodeURIComponent(project.id)}`,
                                            );
                                        }}
                                    >
                                        <Plus className="size-4 text-muted-foreground" />
                                        <span className="truncate">
                                            New thread in {project.name}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ) : null}

                        {showCreateGroup &&
                        (filteredProjects.length > 0 ||
                            filteredThreads.length > 0) ? (
                            <CommandSeparator />
                        ) : null}

                        {filteredProjects.length > 0 ? (
                            <CommandGroup heading="Projects">
                                {filteredProjects.slice(0, 12).map((project: ActorProject) => (
                                    <CommandItem
                                        key={project.id}
                                        value={`project-${project.id}`}
                                        keywords={[
                                            project.name,
                                            project.description || "",
                                        ]}
                                        onSelect={() => {
                                            onOpenChange(false);
                                            router.push(
                                                `/agents/p/${project.id}/tasks`,
                                            );
                                        }}
                                    >
                                        <FolderKanban className="size-4 text-muted-foreground" />
                                        <span className="truncate">
                                            {project.name}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ) : null}

                        {filteredProjects.length > 0 &&
                        filteredThreads.length > 0 ? (
                            <CommandSeparator />
                        ) : null}

                        {filteredThreads.length > 0 ? (
                            <CommandGroup heading="Threads">
                                {filteredThreads.map((thread: AgentThread) => (
                                    <CommandItem
                                        key={thread.id}
                                        value={`thread-${thread.id}`}
                                        keywords={[
                                            getThreadLabel(thread),
                                            thread.project_name || "",
                                            thread.thread_purpose,
                                            thread.responsibility || "",
                                        ]}
                                        onSelect={() => {
                                            onOpenChange(false);
                                            router.push(getThreadHref(thread));
                                        }}
                                    >
                                        {getThreadIcon(thread)}
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate">
                                                {getThreadLabel(thread)}
                                            </div>
                                            <div className="truncate text-sm text-muted-foreground">
                                                {thread.project_name || "Project"}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ) : null}

                        {isSearching ? (
                            <>
                                {hasResults ? <CommandSeparator /> : null}
                                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                                    <LoaderCircle className="size-4 animate-spin" />
                                    <span>Loading threads…</span>
                                </div>
                            </>
                        ) : null}
                    </CommandList>
                </Command>
            </CommandDialog>
        </>
    );
}
