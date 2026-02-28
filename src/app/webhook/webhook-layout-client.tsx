"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WebhookAppProvider, useWebhookApp } from "@/components/webhook-provider";
import { Toaster } from "@/components/ui/sonner";
import { Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
					<div className="px-4 py-3 md:px-6 md:py-4 space-y-6">
						<div className="h-16 flex items-center">
							<div className="flex items-center gap-2">
								<Skeleton className="h-9 w-24 rounded-md" />
								<Skeleton className="h-9 w-24 rounded-md" />
								<Skeleton className="h-9 w-24 rounded-md" />
								<Skeleton className="h-9 w-24 rounded-md" />
							</div>
						</div>
						<div className="space-y-4">
							<Skeleton className="h-10 w-56 rounded-lg" />
							<Skeleton className="h-32 w-full rounded-xl" />
							<Skeleton className="h-72 w-full rounded-xl" />
						</div>
					</div>
				) : (
					<div className="h-screen flex items-center justify-center">
						<div className="max-w-md text-center space-y-6 p-8">
							<>
								<div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
									<Globe className="w-8 h-8 text-foreground" />
								</div>
							<div>
								<h1 className="text-xl text-foreground mb-2">Access Required</h1>
								<p className="text-muted-foreground">You dont have access to this resource.</p>
							</div>
							</>
						</div>
					</div>
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
		<div className="min-h-screen bg-background flex flex-col">
			<div className="flex h-16 items-center px-4 md:px-6 justify-between">
				<div className="flex items-center gap-8">
					<Tabs value={activeTab}>
						<TabsList>
							{navItems.map((item) => (
								<TabsTrigger key={item.value} value={item.value}>
									<Link href={item.href}>{item.label}</Link>
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>
			</div>

			<main className="flex-1">{children}</main>
			<Toaster position="bottom-right" richColors closeButton />
		</div>
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
