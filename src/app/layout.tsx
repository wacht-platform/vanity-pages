import { headers } from "next/headers";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { DeploymentInitialized, DeploymentProvider } from "@wacht/nextjs";
import "./globals.css";
import { ClientProviders } from "@/components/providers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const newsreader = Newsreader({
    variable: "--font-serif",
    subsets: ["latin"],
    style: ["normal", "italic"],
});

export const dynamic = "force-dynamic";

function deriveFrontendApiBase(rawHost: string): string | null {
    const host = rawHost.trim();
    if (!host) return null;

    const slug = host.split(".")[0];
    const backendUrl = host.split(".").slice(1).join(".");
    if (!backendUrl) return null;

    if (backendUrl.includes("trywacht.xyz")) {
        return `https://${slug}.fapi.trywacht.xyz`;
    }

    return `https://frontend.${backendUrl}`;
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headersList = await headers();
    const portalHost =
        headersList.get("x-forwarded-host") ||
        headersList.get("host") ||
        "";

    // Local dev: set NEXT_PUBLIC_WACHT_PUBLIC_KEY in .env.local to point the
    // app at a real deployment (host-based derivation doesn't work on localhost).
    const envPublicKey = process.env.NEXT_PUBLIC_WACHT_PUBLIC_KEY?.trim();
    const frontendApiBase = deriveFrontendApiBase(portalHost) || "";
    const publicKey =
        envPublicKey ||
        (frontendApiBase
            ? `pk_test_${Buffer.from(frontendApiBase).toString("base64")}`
            : "");

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} bg-background font-sans text-foreground antialiased`}
            >
                <DeploymentProvider publicKey={publicKey}>
                    <DeploymentInitialized>
                        <ClientProviders>{children}</ClientProviders>
                    </DeploymentInitialized>
                </DeploymentProvider>
            </body>
        </html>
    );
}
