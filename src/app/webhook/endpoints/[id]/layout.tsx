import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Endpoint Details",
};

export default function WebhookEndpointDetailLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
