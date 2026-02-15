import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "API Keys",
};

export default function ApiAuthKeysLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
