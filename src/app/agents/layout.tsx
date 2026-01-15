import { AppSidebar } from "@/components/layout/sidebar";

export default function AgentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-hidden h-full">
                {children}
            </main>
        </div>
    );
}
