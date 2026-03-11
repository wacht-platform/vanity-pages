"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiAuthProvider, useApiAuth } from "@/components/api-auth-provider";
import { Activity, Key, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/ui/page-state";

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
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const navItems = [
		{ value: "overview", label: "Overview", href: "/api-auth", icon: Key },
		{ value: "keys", label: "API Keys", href: "/api-auth/keys", icon: List },
		{ value: "logs", label: "Access Logs", href: "/api-auth/logs", icon: Activity },
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
							</div>
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

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
				<div className="flex h-16 items-center px-4 md:px-6">
					<div className="flex items-center gap-8">
						<Tabs value={pathname?.startsWith("/api-auth/keys") ? "keys" : pathname?.startsWith("/api-auth/logs") ? "logs" : "overview"}>
							<TabsList>
								{navItems.map((item) => (
									<TabsTrigger key={item.value} value={item.value} asChild>
										<Link href={item.href}>{item.label}</Link>
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
				</div>

				{mobileMenuOpen && (
					<div className="md:hidden bg-background">
						<nav className="px-4 py-3 space-y-1">
							{navItems.map((item) => {
								const Icon = item.icon;
								const isActive =
									item.value === "overview"
										? pathname === "/api-auth"
										: pathname === item.href || pathname?.startsWith(item.href);

								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className={cn(
											"flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
											isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
										)}
									>
										<Icon className="w-4 h-4" />
										<span>{item.label}</span>
									</Link>
								);
							})}
						</nav>
					</div>
				)}
			</header>

			<main className="flex-1">{children}</main>
		</div>
	);
}
