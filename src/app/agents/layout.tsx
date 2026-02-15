import type { Metadata } from "next";
import AgentsLayoutClient from "./agents-layout-client";

export const metadata: Metadata = {
	title: {
		default: "Agents",
		template: "%s | Agents",
	},
};

export default function AgentsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AgentsLayoutClient>{children}</AgentsLayoutClient>;
}
