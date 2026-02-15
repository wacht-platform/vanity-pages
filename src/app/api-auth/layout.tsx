import type { Metadata } from "next";
import ApiAuthLayoutClient from "./api-auth-layout-client";

export const metadata: Metadata = {
	title: {
		default: "Overview | API Identity",
		template: "%s | API Identity",
	},
};

export default function ApiAuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ApiAuthLayoutClient>{children}</ApiAuthLayoutClient>;
}
