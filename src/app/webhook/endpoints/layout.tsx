import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Endpoints",
};

export default function WebhookEndpointsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
