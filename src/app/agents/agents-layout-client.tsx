"use client";

import { IconAlertCircle } from "@tabler/icons-react";
import { AppSidebar } from "@/components/layout/sidebar";
import { ActiveAgentProvider, useActiveAgent } from "@/components/agent-provider";
import { LoadingScreen } from "@/components/ui/spinner";
import { PageState } from "@/components/ui/page-state";

function AgentsLayoutContent({ children }: { children: React.ReactNode }) {
    const { hasSession, loading, sessionError } = useActiveAgent();

    if (loading) {
        return (
            <LoadingScreen className="min-h-screen bg-background" />
        );
    }

    if (!hasSession || sessionError) {
        return (
            <PageState
                title="Access denied"
                description="You do not have access to this resource. Request a new session link."
                icon={<IconAlertCircle size={20} stroke={1.95} />}
                className="min-h-screen bg-background"
            />
        );
    }

    return (
        <div className="relative h-screen overflow-hidden bg-muted/20 text-muted-foreground font-sans selection:bg-accent/50">
            <div className="relative flex h-full">
                <AppSidebar />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <main className="min-w-0 flex-1 overflow-auto bg-background">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function AgentsLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ActiveAgentProvider>
            <AgentsLayoutContent>{children}</AgentsLayoutContent>
        </ActiveAgentProvider>
    );
}
