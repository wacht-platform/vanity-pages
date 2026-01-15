import { headers } from "next/headers";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { DeploymentInitialized, DeploymentProvider } from "@wacht/nextjs";
import { DeploymentStyling } from "@/components/deployment-styling";
import "./globals.css";
import { ClientProviders } from "@/components/providers";
import type { Metadata } from "next";

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

function generatePublicKey(host: string) {
  const slug = host.split(".")[0];
  const backendUrl = host.split(".").slice(1).join(".");

  if (backendUrl.includes("trywacht.xyz")) {
    return `pk_test_${btoa(`https://${slug}.frontend-api.services`)}`;
  } else {
    return `pk_live_${btoa(`https://frontend.${backendUrl}`)}`;
  }
}

type Meta = {
  app_name: string;
  favicon_image_url: string;
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    let host =
      headersList.get("x-forwarded-host") || headersList.get("host") || "";

    const slug = host.split(".")[0];
    const backendUrl = host.split(".").slice(1).join(".");

    if (backendUrl.includes("trywacht.xyz")) {
      host = `https://${slug}.frontend-api.services`;
    } else {
      host = `https://frontend.${backendUrl}`;
    }

    const meta: { data: Meta } = await fetch(`${host}/.well-known/meta`).then(
      (res) => res.json(),
    );

    return {
      title: meta.data.app_name,
      icons: [{ url: meta.data.favicon_image_url }],
    };
  } catch (error) {
    // Error fetching meta
    return {
      title: "AI Agent",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let publicKey = "";

  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") || headersList.get("host") || "";
    publicKey = generatePublicKey(host);
  } catch (error) {
    // Error generating public key
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
      >
        <DeploymentProvider publicKey={publicKey}>
          <DeploymentInitialized>
            <DeploymentStyling />
            <ClientProviders>{children}</ClientProviders>
          </DeploymentInitialized>
        </DeploymentProvider>
      </body>
    </html>
  );
}
