import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Events",
};

export default function WebhookEventsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
