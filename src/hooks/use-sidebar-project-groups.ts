"use client";

import { useRoutedActorProjects } from "@/hooks/use-routed-actor-projects";

export function useSidebarProjectGroups(enabled = true) {
  const {
    currentProjectId,
    createProject,
    error,
    loading,
    projects,
  } = useRoutedActorProjects(enabled);

  return {
    currentProjectId,
    createProject,
    error,
    loading,
    projects,
  };
}
