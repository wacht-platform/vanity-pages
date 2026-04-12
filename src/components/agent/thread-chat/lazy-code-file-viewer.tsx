import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const LazyCodeFileViewer = dynamic(
  () => import("@/components/agent/code-file-viewer").then((mod) => mod.CodeFileViewer),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 w-full bg-accent/50" />,
  },
);
