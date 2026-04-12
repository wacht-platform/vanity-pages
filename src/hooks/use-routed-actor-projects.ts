"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useActorProjects } from "@wacht/nextjs";
import type { ActorProject } from "@wacht/types";

import { useActiveAgent } from "@/components/agent-provider";

export function sortActorProjects(projects: ActorProject[]) {
  return [...projects].sort((a, b) => {
    const aTime = new Date(a.updated_at).getTime();
    const bTime = new Date(b.updated_at).getTime();
    return bTime - aTime;
  });
}

export function useRoutedActorProjects(enabled = true) {
  const pathname = usePathname();
  const { hasSession, actor } = useActiveAgent();
  const routeProjectId = useMemo(() => {
    const match = pathname.match(/^\/agents\/p\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);
  const projectsEnabled = enabled && hasSession;

  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    refetch,
  } = useActorProjects({
    enabled: projectsEnabled,
  });

  const sortedProjects = useMemo(() => sortActorProjects(projects), [projects]);
  const project = routeProjectId
    ? sortedProjects.find((item) => item.id === routeProjectId) || null
    : sortedProjects[0] || null;

  return {
    actor,
    hasSession,
    routeProjectId,
    project,
    projects: sortedProjects,
    currentProjectId: routeProjectId || project?.id || null,
    loading: projectsEnabled ? loading : false,
    error: projectsEnabled ? error : null,
    createProject,
    updateProject,
    refetchProjects: refetch,
  };
}
