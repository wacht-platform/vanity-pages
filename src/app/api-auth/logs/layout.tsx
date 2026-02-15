import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Access Logs",
};

export default function ApiAuthLogsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
