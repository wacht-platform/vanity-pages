"use client";

import * as React from "react";
import {
    Cable,
    CircleOff,
    ExternalLink,
    RefreshCcw,
    Unplug,
} from "lucide-react";
import { useActorMcpServers } from "@wacht/nextjs";
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

function statusLabel(status: string) {
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

function statusVariant(status: string): "default" | "secondary" | "outline" {
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

export default function AgentMcpPage() {
    const { hasSession } = useActiveAgent();
    const { servers, loading, error, connect, disconnect, refetch } =
        useActorMcpServers(hasSession);
    const [busyId, setBusyId] = React.useState<string | null>(null);

    return (
        <AgentPageShell
            title="MCP Servers"
            actions={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            }
        >
            <div className="space-y-5">
                {loading ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                                Servers
                            </span>
                            <span className="text-sm text-muted-foreground">
                                …
                            </span>
                        </div>
                        <div className="rounded-md border border-border/60">
                            <div className="grid grid-cols-[minmax(0,1.4fr)_150px_220px] gap-4 border-b border-border/60 px-4 py-3 text-xs text-muted-foreground">
                                <span>Name</span>
                                <span>Status</span>
                                <span className="text-right">Actions</span>
                            </div>
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-[minmax(0,1.4fr)_150px_220px] gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
                                >
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                    <Skeleton className="h-6 w-28" />
                                    <div className="flex justify-end gap-2">
                                        <Skeleton className="h-8 w-24" />
                                        <Skeleton className="h-8 w-24" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <PageState
                        title="Failed to load MCP servers"
                        description="The MCP server list could not be loaded."
                        icon={<CircleOff className="h-5 w-5" />}
                        className="py-8"
                    />
                ) : servers.length === 0 ? (
                    <PageState
                        title="No MCP servers"
                        description="No deployment MCP servers are configured yet."
                        icon={<Cable className="h-5 w-5" />}
                        className="py-8"
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                                Servers
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {servers.length}
                            </span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[220px] text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servers.map((server: (typeof servers)[number]) => (
                                    <TableRow key={server.id}>
                                        <TableCell>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm text-foreground">
                                                    {server.name}
                                                </div>
                                                <div
                                                    className="mt-1 truncate text-xs text-muted-foreground"
                                                    title={server.endpoint}
                                                >
                                                    {server.endpoint}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={statusVariant(
                                                    server.connection_status,
                                                )}
                                            >
                                                {statusLabel(
                                                    server.connection_status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex items-center gap-2">
                                                {server.requires_user_connection ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                busyId ===
                                                                server.id
                                                            }
                                                            onClick={async () => {
                                                                setBusyId(
                                                                    server.id,
                                                                );
                                                                try {
                                                                    const {
                                                                        auth_url,
                                                                    } =
                                                                        await connect(
                                                                            server.id,
                                                                        );
                                                                    window.open(
                                                                        auth_url,
                                                                        "_blank",
                                                                        "noopener,noreferrer",
                                                                    );
                                                                } finally {
                                                                    setBusyId(
                                                                        null,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            {server.connection_status ===
                                                            "connected"
                                                                ? "Reconnect"
                                                                : "Connect"}
                                                        </Button>
                                                        {server.connection_status ===
                                                            "connected" ||
                                                        server.connection_status ===
                                                            "expired" ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={
                                                                    busyId ===
                                                                    server.id
                                                                }
                                                                onClick={async () => {
                                                                    setBusyId(
                                                                        server.id,
                                                                    );
                                                                    try {
                                                                        await disconnect(
                                                                            server.id,
                                                                        );
                                                                    } finally {
                                                                        setBusyId(
                                                                            null,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <Unplug className="mr-2 h-4 w-4" />
                                                                Disconnect
                                                            </Button>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        No action needed
                                                    </span>
                                                )}
                                            </div>
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
