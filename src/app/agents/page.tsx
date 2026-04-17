"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useActorProjects } from "@wacht/nextjs";
import type { ActorProject } from "@wacht/types";
import {
    IconArrowRight,
    IconArchive,
    IconFolders,
    IconPlus,
    IconTerminal,
} from "@tabler/icons-react";
import { useActiveAgent } from "@/components/agent-provider";
import { CreateProjectDialog } from "@/components/agent/project-dialogs";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import {
    AgentPageShell,
    AgentSearchInput,
} from "@/components/agent/agent-page-shell";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
            {!projectsLoading && !projectsError ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <AgentSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search projects..."
                        className="w-full sm:w-65"
                    />
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
            <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{title}</span>
                <span className="text-sm text-muted-foreground">
                    {projects.length}
                </span>
            </div>

            {projects.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                    {emptyLabel || "No projects"}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[96px]"></TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.map((project) => (
                            <ProjectRow
                                key={project.id}
                                project={project}
                                onArchive={onArchive}
                                onUnarchive={onUnarchive}
                            />
                        ))}
                    </TableBody>
                </Table>
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

    return (
        <TableRow
            className="cursor-pointer group"
            onClick={() => {
                router.push(`/agents/p/${project.id}/tasks`);
            }}
        >
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconTerminal className="h-4 w-4" />
                    </div>
                    <span className="font-medium transition-colors group-hover:text-primary">
                        {project.name}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <span
                    className="block max-w-sm truncate text-muted-foreground"
                    title={project.description || ""}
                >
                    {project.description || "No description"}
                </span>
            </TableCell>
            <TableCell>
                <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={submitting}
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
                    <span>{project.archived_at ? "Unarchive" : "Archive"}</span>
                </Button>
            </TableCell>
            <TableCell>
                <IconArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            </TableCell>
        </TableRow>
    );
}
