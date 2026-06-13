"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { useActorProjects } from "@wacht/nextjs";
import type { ActorProject } from "@wacht/types";
import {
    IconArchive,
    IconChevronRight,
    IconFolders,
    IconPlus,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { CreateProjectDialog } from "@/components/agent/project-dialogs";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import {
    AgentPageShell,
    AgentSearchInput,
} from "@/components/agent/agent-page-shell";

function formatUpdated(value?: string): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return `${formatDistanceToNowStrict(date)} ago`;
}

export default function AgentsLandingPage() {
    const { hasSession, agents } = useActiveAgent();
    const projectsEnabled = hasSession;
    const {
        projects,
        loading: projectsLoading,
        error: projectsError,
        createProject,
        archiveProject,
        unarchiveProject,
    } = useActorProjects({
        enabled: projectsEnabled,
        includeArchived: true,
    });
    const [search, setSearch] = React.useState("");

    const filteredProjects = React.useMemo<ActorProject[]>(() => {
        return projects.filter((p: ActorProject) => {
            if (!search.trim()) return true;
            return [p.name, p.description, p.id]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search.trim().toLowerCase());
        });
    }, [projects, search]);
    const activeProjects = React.useMemo(
        () => filteredProjects.filter((project) => !project.archived_at),
        [filteredProjects],
    );
    const archivedProjects = React.useMemo(
        () =>
            filteredProjects.filter((project) => Boolean(project.archived_at)),
        [filteredProjects],
    );

    return (
        <AgentPageShell title="Projects">
            <div className="mb-[18px] flex items-start justify-between gap-6">
                <div className="min-w-0">
                    <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                        Workspace · projects
                    </div>
                    <h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                        Projects
                    </h1>
                    <p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
                        Every agent project in this workspace. Open one for its
                        task board and threads.
                    </p>
                </div>
                {!projectsLoading && !projectsError ? (
                    <CreateProjectDialog
                        agents={agents}
                        onCreate={async (r) => {
                            await createProject(r);
                        }}
                        trigger={
                            <Button type="button" size="sm">
                                <IconPlus className="h-4 w-4" />
                                <span>Create project</span>
                            </Button>
                        }
                    />
                ) : null}
            </div>

            {!projectsLoading && !projectsError ? (
                <div className="mb-3.5 flex items-center gap-2">
                    <AgentSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search projects…"
                        className="w-full sm:w-65"
                    />
                    <div className="flex-1" />
                    <span className="font-mono text-[11px] leading-none text-faint">
                        {filteredProjects.length}{" "}
                        {filteredProjects.length === 1 ? "project" : "projects"}
                    </span>
                </div>
            ) : null}

            {projectsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                    Loading projects...
                </div>
            ) : projectsError ? (
                <PageState
                    title="Failed to load projects"
                    description="Projects could not be loaded."
                    icon={<IconFolders size={18} />}
                    className="py-8"
                />
            ) : filteredProjects.length === 0 ? (
                <div className="py-12 text-center">
                    <IconFolders className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-normal">
                        {search ? "No matching projects" : "No projects"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {search
                            ? "Try a different project name or description."
                            : "Get started by creating your first project."}
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    <ProjectTableSection
                        title="Projects"
                        emptyLabel={
                            search
                                ? "No matching active projects"
                                : "No active projects"
                        }
                        projects={activeProjects}
                        onArchive={async (projectId) => (await archiveProject(projectId)).data}
                        onUnarchive={async (projectId) => (await unarchiveProject(projectId)).data}
                    />

                    {archivedProjects.length > 0 ? (
                        <ProjectTableSection
                            title="Archived"
                            projects={archivedProjects}
                            onArchive={async (projectId) => (await archiveProject(projectId)).data}
                            onUnarchive={async (projectId) => (await unarchiveProject(projectId)).data}
                        />
                    ) : null}
                </div>
            )}
        </AgentPageShell>
    );
}

function ProjectTableSection({
    title,
    projects,
    emptyLabel,
    onArchive,
    onUnarchive,
}: {
    title: string;
    projects: ActorProject[];
    emptyLabel?: string;
    onArchive: (projectId: string) => Promise<ActorProject>;
    onUnarchive: (projectId: string) => Promise<ActorProject>;
}) {
    return (
        <section className="space-y-3">
            <div className="flex items-baseline gap-2.5">
                <h2 className="text-[16px] font-medium text-foreground">
                    {title}
                </h2>
                <span className="font-mono text-[13px] text-faint">
                    {projects.length}
                </span>
            </div>

            {projects.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    {emptyLabel || "No projects"}
                </div>
            ) : (
                <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                    <div className="overflow-x-auto">
                        <div className="min-w-[760px]">
                            <div className="grid grid-cols-[8px_1.4fr_1.7fr_56px_60px_96px_76px] items-center gap-[14px] border-b border-border bg-secondary px-[18px] py-[10px] font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                <span />
                                <span>Name</span>
                                <span>Description</span>
                                <span className="text-right">Tasks</span>
                                <span className="text-right">Agents</span>
                                <span className="text-right">Updated</span>
                                <span />
                            </div>
                            {projects.map((project) => (
                                <ProjectRow
                                    key={project.id}
                                    project={project}
                                    onArchive={onArchive}
                                    onUnarchive={onUnarchive}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function ProjectRow({
    project,
    onArchive,
    onUnarchive,
}: {
    project: ActorProject;
    onArchive: (projectId: string) => Promise<ActorProject>;
    onUnarchive: (projectId: string) => Promise<ActorProject>;
}) {
    const router = useRouter();
    const [submitting, setSubmitting] = React.useState(false);
    const isArchived = Boolean(project.archived_at);
    const isActive = !isArchived && project.status === "active";

    return (
        <div
            className="grid cursor-pointer grid-cols-[8px_1.4fr_1.7fr_56px_60px_96px_76px] items-center gap-[14px] border-b border-border px-[18px] py-[13px] last:border-b-0 hover:bg-secondary"
            onClick={() => {
                router.push(`/agents/p/${project.id}/tasks`);
            }}
        >
            <span
                className={
                    isActive
                        ? "size-[7px] rounded-full bg-success"
                        : "size-[7px] rounded-full bg-faint"
                }
            />
            <div className="min-w-0">
                <div className="truncate text-[13px] font-medium leading-[1.2] text-foreground">
                    {project.name}
                </div>
                <div className="mt-[3px] truncate font-mono text-[11px] leading-none text-faint">
                    {project.id}
                </div>
            </div>
            {project.description ? (
                <span
                    className="truncate text-[12px] text-muted-foreground"
                    title={project.description}
                >
                    {project.description}
                </span>
            ) : (
                <span className="truncate text-[12px] italic text-faint">
                    No description
                </span>
            )}
            <span className="text-right font-mono text-[12px] font-medium tabular-nums text-foreground-secondary">
                —
            </span>
            <span className="text-right font-mono text-[12px] font-medium tabular-nums text-foreground-secondary">
                —
            </span>
            <span className="text-right font-mono text-[11px] text-muted-foreground">
                {formatUpdated(project.updated_at)}
            </span>
            <span className="flex items-center justify-end gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={submitting}
                    aria-label={isArchived ? "Unarchive" : "Archive"}
                    onClick={async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSubmitting(true);
                        try {
                            if (project.archived_at) {
                                await onUnarchive(project.id);
                            } else {
                                await onArchive(project.id);
                            }
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    <IconArchive className="h-3.5 w-3.5" />
                </Button>
                <IconChevronRight className="size-3.5 text-faint" />
            </span>
        </div>
    );
}
