"use client";

import { usePathname } from "next/navigation";
import { WebhookAppProvider, useWebhookApp } from "@/components/webhook-provider";
import { Toaster } from "@/components/ui/sonner";
import { Webhook } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";
import { VanityShell } from "@/components/layout/vanity-shell";

function WebhookLayoutContent({ children }: { children: React.ReactNode }) {
	const { hasSession, loading, sessionError } = useWebhookApp();
	const pathname = usePathname();

	const navItems = [
		{ value: "overview", label: "Overview", href: "/webhook" },
		{ value: "endpoints", label: "Endpoints", href: "/webhook/endpoints" },
		{ value: "events", label: "Events", href: "/webhook/events" },
		{ value: "logs", label: "Deliveries", href: "/webhook/deliveries" },
		{ value: "notifications", label: "Notifications", href: "/webhook/notifications" },
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
						icon={<Webhook className="h-5 w-5" />}
					/>
				)}
			</div>
		);
	}

	let activeTab = "overview";
	if (pathname?.startsWith("/webhook/endpoints")) activeTab = "endpoints";
	else if (pathname?.startsWith("/webhook/events")) activeTab = "events";
	else if (pathname?.startsWith("/webhook/deliveries")) activeTab = "logs";
	else if (pathname?.startsWith("/webhook/notifications")) activeTab = "notifications";

	return (
		<>
			<VanityShell
				brand={{
					icon: <Webhook className="h-4 w-4" />,
					title: "Webhooks",
					subtitle: "Endpoints & deliveries",
				}}
				navItems={navItems}
				activeNavValue={activeTab}
			>
				{children}
			</VanityShell>
			<Toaster position="bottom-right" richColors closeButton />
		</>
	);
}

export default function WebhookLayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<WebhookAppProvider>
			<WebhookLayoutContent>{children}</WebhookLayoutContent>
		</WebhookAppProvider>
	);
}
