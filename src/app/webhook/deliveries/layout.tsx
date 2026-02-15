import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Deliveries",
};

export default function WebhookDeliveriesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
