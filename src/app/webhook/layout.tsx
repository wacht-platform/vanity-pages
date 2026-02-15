import type { Metadata } from "next";
import WebhookLayoutClient from "./webhook-layout-client";

export const metadata: Metadata = {
	title: {
		default: "Overview | Webhooks",
		template: "%s | Webhooks",
	},
};

export default function WebhookLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <WebhookLayoutClient>{children}</WebhookLayoutClient>;
}
