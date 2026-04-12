"use client";

import { useRoutedActorProjects } from "@/hooks/use-routed-actor-projects";

export function useProjectContext(enabled = true) {
  return useRoutedActorProjects(enabled);
}
