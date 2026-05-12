"use client";

import { usePathname } from "next/navigation";
import { ApiAuthProvider, useApiAuth } from "@/components/api-auth-provider";
import { Key } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";
import { VanityShell } from "@/components/layout/vanity-shell";

export default function ApiAuthLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ApiAuthProvider>
            <ApiAuthLayoutContent>{children}</ApiAuthLayoutContent>
        </ApiAuthProvider>
    );
}

function ApiAuthLayoutContent({ children }: { children: React.ReactNode }) {
    const { hasSession, loading, sessionError } = useApiAuth();
    const pathname = usePathname();

    const navItems = [
        { value: "overview", label: "Overview", href: "/api-auth" },
        { value: "keys", label: "API Keys", href: "/api-auth/keys" },
        { value: "logs", label: "Access Logs", href: "/api-auth/logs" },
    ];

    if (!hasSession || sessionError || loading) {
        return (
            <div className="min-h-screen bg-background">
                {loading ? (
                    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-24 rounded-md" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-56 rounded-lg" />
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <Skeleton className="h-72 w-full rounded-xl" />
                        </div>
                    </div>
                ) : (
                    <PageState
                        title="Access required"
                        description="You do not have access to this resource."
                        icon={<Key className="h-5 w-5" />}
                    />
                )}
            </div>
        );
    }

    const activeNavValue = pathname?.startsWith("/api-auth/keys")
        ? "keys"
        : pathname?.startsWith("/api-auth/logs")
          ? "logs"
          : "overview";

    return (
        <VanityShell navItems={navItems} activeNavValue={activeNavValue}>
            {children}
        </VanityShell>
    );
}
