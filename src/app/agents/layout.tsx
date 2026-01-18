"use client";

import { AppSidebar } from "@/components/layout/sidebar";
import { ActiveAgentProvider, useActiveAgent } from "@/components/agent-provider";
import { LoadingScreen } from "@/components/ui/spinner";

function AgentsLayoutContent({ children }: { children: React.ReactNode }) {
    const { hasSession, loading, sessionError } = useActiveAgent();

    if (loading) {
        return (<div className="h-screen flex items-center justify-center"><LoadingScreen /></div>);
    }

    if (!hasSession || sessionError) {
        return (
            <div className="h-screen flex items-center justify-center p-8 bg-[#211f1d]">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-xl font-bold tracking-tight text-red-500">Access Denied</h1>
                    <p className="text-[#9e9e9e]">You don't have access to this resource. Please request a new session link.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-hidden h-full">
                {children}
            </main>
        </div>
    );
}

export default function AgentsLayout({
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
