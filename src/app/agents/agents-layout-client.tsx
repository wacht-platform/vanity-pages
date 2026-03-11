"use client";

import { AppSidebar } from "@/components/layout/sidebar";
import { ActiveAgentProvider, useActiveAgent } from "@/components/agent-provider";
import { LoadingScreen } from "@/components/ui/spinner";
import { PageState } from "@/components/ui/page-state";
import { AlertCircle } from "lucide-react";

function AgentsLayoutContent({ children }: { children: React.ReactNode }) {
	const { hasSession, loading, sessionError } = useActiveAgent();

	if (loading) {
		return <div className="h-screen flex items-center justify-center"><LoadingScreen /></div>;
	}

	if (!hasSession || sessionError) {
		return (
			<PageState
				title="Access denied"
				description="You do not have access to this resource. Request a new session link."
				icon={<AlertCircle className="h-5 w-5" />}
				className="min-h-screen bg-background"
			/>
		);
	}

	return (
		<div className="flex h-screen overflow-hidden bg-background text-foreground">
			<AppSidebar />
			<main className="flex-1 overflow-hidden h-full bg-background">{children}</main>
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
