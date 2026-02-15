import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Chats",
};

export default function AgentChatsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
