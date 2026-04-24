"use client";

import * as React from "react";
import {
    Cable,
    CircleOff,
    ExternalLink,
    RefreshCcw,
    Unplug,
} from "lucide-react";
import {
    useActorMcpServers,
    useExternalAgentConnections,
    type ActorMcpServerSummary,
    type ExternalAgentConnection,
} from "@wacht/nextjs";
import { AgentPageShell } from "@/components/agent/agent-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useActiveAgent } from "@/components/agent-provider";

type UnifiedRow = {
    key: string;
    kind: "mcp" | "external";
    name: string;
    subtitle?: string;
    logoUrl?: string;
    source: string;
    status: string;
    statusLabel: string;
    statusVariant: "default" | "secondary" | "outline";
    requiresConnection: boolean;
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
};

function mcpStatusLabel(status: string): string {
    switch (status) {
        case "connected":
            return "Connected";
        case "expired":
            return "Expired";
        case "not_connected":
            return "Needs connection";
        default:
            return "Ready";
    }
}

function mcpStatusVariant(status: string): "default" | "secondary" | "outline" {
    switch (status) {
        case "connected":
            return "default";
        case "expired":
            return "outline";
        case "not_connected":
            return "secondary";
        default:
            return "secondary";
    }
}

function externalStatusLabel(status: string): string {
    switch (status) {
        case "active":
            return "Connected";
        case "pending":
            return "Pending";
        case "expired":
            return "Expired";
        case "failed":
            return "Failed";
        default:
            return "Not connected";
    }
}

function externalStatusVariant(
    status: string,
): "default" | "secondary" | "outline" {
    switch (status) {
        case "active":
            return "default";
        case "expired":
        case "failed":
            return "outline";
        default:
            return "secondary";
    }
}

export default function IntegrationsPage() {
    const { hasSession } = useActiveAgent();

    const {
        servers,
        loading: mcpLoading,
        error: mcpError,
        connect: connectMcp,
        disconnect: disconnectMcp,
        refetch: refetchMcp,
    } = useActorMcpServers(hasSession);

    const {
        connections,
        loading: extLoading,
        error: extError,
        connect: connectExternal,
        disconnect: disconnectExternal,
        refetch: refetchExternal,
    } = useExternalAgentConnections(hasSession);

    const [busyKey, setBusyKey] = React.useState<string | null>(null);

    const loading = mcpLoading || extLoading;
    const error = mcpError || extError;

    const refetchAll = React.useCallback(async () => {
        await Promise.all([refetchMcp(), refetchExternal()]);
    }, [refetchMcp, refetchExternal]);

    const rows = React.useMemo<UnifiedRow[]>(() => {
        const mcpRows: UnifiedRow[] = servers.map(
            (server: ActorMcpServerSummary) => ({
                key: `mcp:${server.id}`,
                kind: "mcp",
                name: server.name,
                subtitle: server.endpoint,
                source: "MCP",
                status: server.connection_status,
                statusLabel: mcpStatusLabel(server.connection_status),
                statusVariant: mcpStatusVariant(server.connection_status),
                requiresConnection: server.requires_user_connection,
                onConnect: server.requires_user_connection
                    ? async () => {
                          const result = await connectMcp(server.id);
                          window.open(
                              result.data.auth_url,
                              "_blank",
                              "noopener,noreferrer",
                          );
                      }
                    : undefined,
                onDisconnect:
                    server.requires_user_connection &&
                    (server.connection_status === "connected" ||
                        server.connection_status === "expired")
                        ? async () => {
                              await disconnectMcp(server.id);
                          }
                        : undefined,
            }),
        );

        const extRows: UnifiedRow[] = connections.map(
            (conn: ExternalAgentConnection) => ({
                key: `${conn.provider}:${conn.slug}`,
                kind: "external",
                name: conn.display_name || conn.slug,
                subtitle: conn.slug,
                logoUrl: conn.logo_url,
                source: providerLabel(conn.provider),
                status: conn.status,
                statusLabel: externalStatusLabel(conn.status),
                statusVariant: externalStatusVariant(conn.status),
                requiresConnection: true,
                onConnect: async () => {
                    const result = await connectExternal(
                        conn.provider,
                        conn.slug,
                    );
                    window.open(
                        result.redirect_url,
                        "_blank",
                        "noopener,noreferrer",
                    );
                },
                onDisconnect:
                    conn.status === "active" ||
                    conn.status === "expired" ||
                    conn.status === "failed"
                        ? async () => {
                              await disconnectExternal(
                                  conn.provider,
                                  conn.slug,
                              );
                          }
                        : undefined,
            }),
        );

        return [...extRows, ...mcpRows];
    }, [servers, connections, connectMcp, disconnectMcp, connectExternal, disconnectExternal]);

    return (
        <AgentPageShell
            title="Integrations"
            actions={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchAll()}
                >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            }
        >
            <div className="space-y-5">
                {loading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <PageState
                        title="Failed to load integrations"
                        description="Your integrations could not be loaded."
                        icon={<CircleOff className="h-5 w-5" />}
                        className="py-8"
                    />
                ) : rows.length === 0 ? (
                    <PageState
                        title="No integrations"
                        description="No integrations are available for this deployment yet."
                        icon={<Cable className="h-5 w-5" />}
                        className="py-8"
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                                Connections
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {rows.length}
                            </span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[120px]">
                                        Source
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        Status
                                    </TableHead>
                                    <TableHead className="w-[220px] text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.key}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    logoUrl={row.logoUrl}
                                                    name={row.name}
                                                />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm text-foreground">
                                                        {row.name}
                                                    </div>
                                                    {row.subtitle && (
                                                        <div
                                                            className="mt-0.5 truncate text-xs text-muted-foreground"
                                                            title={row.subtitle}
                                                        >
                                                            {row.subtitle}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {row.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={row.statusVariant}
                                            >
                                                {row.statusLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <RowActions
                                                row={row}
                                                busy={busyKey === row.key}
                                                onBusy={setBusyKey}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </AgentPageShell>
    );
}

function providerLabel(provider: string): string {
    if (provider === "composio") return "Composio";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function Avatar({ logoUrl, name }: { logoUrl?: string; name: string }) {
    const initial = (name.charAt(0) || "?").toUpperCase();
    return (
        <div className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background">
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                    loading="lazy"
                />
            ) : (
                <span className="text-xs font-medium text-muted-foreground">
                    {initial}
                </span>
            )}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">Connections</span>
                <span className="text-sm text-muted-foreground">…</span>
            </div>
            <div className="rounded-md border border-border/60">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="grid grid-cols-[minmax(0,1.4fr)_120px_150px_220px] gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                        <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RowActions({
    row,
    busy,
    onBusy,
}: {
    row: UnifiedRow;
    busy: boolean;
    onBusy: (key: string | null) => void;
}) {
    if (!row.requiresConnection) {
        return (
            <span className="text-xs text-muted-foreground">
                No action needed
            </span>
        );
    }

    const run = async (fn?: () => Promise<void>) => {
        if (!fn) return;
        onBusy(row.key);
        try {
            await fn();
        } finally {
            onBusy(null);
        }
    };

    const connectLabel =
        row.status === "active" || row.status === "connected"
            ? "Reconnect"
            : "Connect";

    return (
        <div className="inline-flex items-center gap-2">
            {row.onConnect && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(row.onConnect)}
                >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {connectLabel}
                </Button>
            )}
            {row.onDisconnect && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(row.onDisconnect)}
                >
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                </Button>
            )}
        </div>
    );
}
