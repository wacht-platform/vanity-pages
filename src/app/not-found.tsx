"use client";

import Link from "next/link";
import { PageState } from "@/components/ui/page-state";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFoundPage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageState
				title="Page not found"
				description="The page you are looking for does not exist or is no longer available."
				icon={<SearchX className="h-5 w-5" />}
				className="min-h-screen"
			/>
			<div className="-mt-28 flex justify-center pb-16">
				<Button asChild>
					<Link href="/">Go back home</Link>
				</Button>
			</div>
		</div>
	);
}
