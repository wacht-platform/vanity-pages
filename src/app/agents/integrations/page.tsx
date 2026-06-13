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
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { Skeleton } from "@/components/ui/skeleton";
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

    const { connected, available } = React.useMemo(() => {
        const connected: UnifiedRow[] = [];
        const available: UnifiedRow[] = [];
        for (const row of rows) {
            if (isAvailable(row)) {
                available.push(row);
            } else {
                connected.push(row);
            }
        }
        return { connected, available };
    }, [rows]);

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
            <div className="mb-[18px] flex items-start justify-between gap-6">
                <div className="min-w-0">
                    <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                        Agents
                    </div>
                    <h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                        Integrations
                    </h1>
                    <p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
                        Connect external tools and MCP servers so your agents
                        can read context and take action across your stack.
                    </p>
                </div>
            </div>

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
                <div className="space-y-7">
                    {connected.length > 0 && (
                        <ConnectorSection
                            heading="Connected"
                            rows={connected}
                            busyKey={busyKey}
                            onBusy={setBusyKey}
                        />
                    )}
                    {available.length > 0 && (
                        <ConnectorSection
                            heading="Available"
                            rows={available}
                            busyKey={busyKey}
                            onBusy={setBusyKey}
                        />
                    )}
                </div>
            )}
        </AgentPageShell>
    );
}

function providerLabel(provider: string): string {
    if (provider === "composio") return "Composio";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function isAvailable(row: UnifiedRow): boolean {
    if (!row.requiresConnection) return false;
    return (
        row.status === "not_connected" ||
        row.status === "ready" ||
        row.status === "" ||
        (row.kind === "external" &&
            row.status !== "active" &&
            row.status !== "pending" &&
            row.status !== "expired" &&
            row.status !== "failed")
    );
}

function isOk(status: string): boolean {
    return status === "active" || status === "connected";
}

function ConnectorSection({
    heading,
    rows,
    busyKey,
    onBusy,
}: {
    heading: string;
    rows: UnifiedRow[];
    busyKey: string | null;
    onBusy: (key: string | null) => void;
}) {
    return (
        <section>
            <div className="mb-4 flex items-baseline gap-2.5">
                <h2 className="text-[16px] font-medium text-foreground">
                    {heading}
                </h2>
                <span className="font-mono text-[13px] text-faint">
                    {rows.length}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                    <ConnectorCard
                        key={row.key}
                        row={row}
                        busy={busyKey === row.key}
                        onBusy={onBusy}
                    />
                ))}
            </div>
        </section>
    );
}

function ConnectorCard({
    row,
    busy,
    onBusy,
}: {
    row: UnifiedRow;
    busy: boolean;
    onBusy: (key: string | null) => void;
}) {
    const available = isAvailable(row);

    const run = async (fn?: () => Promise<void>) => {
        if (!fn) return;
        onBusy(row.key);
        try {
            await fn();
        } finally {
            onBusy(null);
        }
    };

    return (
        <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4">
            <div className="flex items-center gap-[11px]">
                <Logo logoUrl={row.logoUrl} name={row.name} />
                <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-foreground">
                        {row.name}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-faint">
                        {row.source}
                    </div>
                </div>
            </div>
            {row.subtitle && (
                <div
                    className="flex-1 truncate text-[12px] leading-[1.5] text-muted-foreground"
                    title={row.subtitle}
                >
                    {row.subtitle}
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                {available ? (
                    <>
                        <span />
                        {row.onConnect && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void run(row.onConnect)}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Connect
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <StatusPill row={row} />
                        <CardActions row={row} busy={busy} run={run} />
                    </>
                )}
            </div>
        </div>
    );
}

function StatusPill({ row }: { row: UnifiedRow }) {
    const ok = isOk(row.status);
    const pillClass = ok
        ? "border-success/30 bg-success-soft text-success"
        : "border-warning/30 bg-warning-soft text-warning";
    const dotClass = ok ? "bg-success" : "bg-warning";
    const label = ok ? "connected" : "needs auth";

    return (
        <span
            className={`inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase ${pillClass}`}
        >
            <span className={`size-[6px] rounded-full ${dotClass}`} />
            {label}
        </span>
    );
}

function CardActions({
    row,
    busy,
    run,
}: {
    row: UnifiedRow;
    busy: boolean;
    run: (fn?: () => Promise<void>) => Promise<void>;
}) {
    if (!row.requiresConnection) {
        return (
            <span className="font-mono text-[11px] text-faint">
                no action needed
            </span>
        );
    }

    const reconnectLabel = isOk(row.status) ? "Manage" : "Reconnect";

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
                    {reconnectLabel}
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

function Logo({ logoUrl, name }: { logoUrl?: string; name: string }) {
    const initials = name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";
    return (
        <span className="grid size-[38px] flex-none place-items-center overflow-hidden rounded-[9px] border border-border bg-secondary text-[14px] font-medium text-foreground">
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain p-1.5"
                    loading="lazy"
                />
            ) : (
                initials
            )}
        </span>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-7">
            {Array.from({ length: 2 }).map((_, section) => (
                <section key={section}>
                    <div className="mb-4 flex items-baseline gap-2.5">
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((__, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4"
                            >
                                <div className="flex items-center gap-[11px]">
                                    <Skeleton className="size-[38px] rounded-[9px]" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-full" />
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-[22px] w-24" />
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
