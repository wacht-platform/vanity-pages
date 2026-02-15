import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Integrations",
};

export default function AgentIntegrationsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
