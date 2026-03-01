"use client"

import * as React from "react"
import { useActiveAgent } from "@/components/agent-provider"
import { useAgentIntegrations, useAgentMcpServers } from "@wacht/nextjs"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { AlertCircle, Trash2, ExternalLink, Server } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AgentIntegration, McpConnectResponse } from "@wacht/types"

type DisconnectTarget = {
    kind: "integration" | "mcp"
    id: string
    name: string
} | null

export default function IntegrationsPage() {
    const { activeAgent, loading: agentLoading } = useActiveAgent()
    const {
        integrations: activeIntegrations,
        loading: integrationsLoading,
        generateConsentURL,
        removeIntegration,
        refetch,
    } = useAgentIntegrations(activeAgent?.name || null)
    const {
        mcpServers,
        loading: mcpServersLoading,
        connect: connectMcpServer,
        disconnect: disconnectMcpServer,
        refetch: refetchMcpServers,
    } = useAgentMcpServers(activeAgent?.name || null)

    const [connectingId, setConnectingId] = React.useState<string | null>(null)
    const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null)
    const [connectingMcpId, setConnectingMcpId] = React.useState<string | null>(null)
    const [disconnectingMcpId, setDisconnectingMcpId] = React.useState<string | null>(null)
    const [disconnectTarget, setDisconnectTarget] = React.useState<DisconnectTarget>(null)
    const [error, setError] = React.useState<string | null>(null)

    const displayedIntegrations = React.useMemo(() => {
        if (!activeAgent?.integrations) return []

        return activeAgent.integrations.map((integration) => {
            const isActive = activeIntegrations.some((ai: AgentIntegration) => ai.id === integration.id)
            return {
                ...integration,
                is_active: isActive,
            }
        })
    }, [activeAgent, activeIntegrations])

    const displayedMcpServers = React.useMemo(() => {
        const availableMcpServers = (
            activeAgent as unknown as { mcp_servers?: Array<{ id: string; name: string; requires_connection?: boolean }> } | null
        )?.mcp_servers || []

        return availableMcpServers.map((server) => {
            const requiresConnection = server.requires_connection !== false
            const isActive = !requiresConnection || mcpServers.some((activeServer) => String(activeServer.id) === String(server.id))
            return {
                ...server,
                requires_connection: requiresConnection,
                is_active: isActive,
            }
        })
    }, [activeAgent, mcpServers])

    const handleConnect = async (integrationId: string) => {
        setConnectingId(integrationId)
        setError(null)
        try {
            const response = await generateConsentURL(integrationId)
            window.open(response.consent_url, "_blank")
        } catch {
            setError("Failed to initiate connection")
        } finally {
            setConnectingId(null)
        }
    }

    const handleMcpConnect = async (mcpServerId: string) => {
        setConnectingMcpId(mcpServerId)
        setError(null)
        try {
            const response = await connectMcpServer(mcpServerId)
            if (response.requires_oauth && response.oauth_url) {
                window.open(response.oauth_url, "_blank", "noopener,noreferrer")
                return
            }
            await refetchMcpServers()
        } catch {
            setError("Failed to connect MCP server")
        } finally {
            setConnectingMcpId(null)
        }
    }

    const onRequestDisconnectIntegration = (integration: { id: string; name: string }) => {
        setDisconnectTarget({ kind: "integration", id: String(integration.id), name: integration.name })
    }

    const onRequestDisconnectMcp = (mcpServer: { id: string; name: string }) => {
        setDisconnectTarget({ kind: "mcp", id: String(mcpServer.id), name: mcpServer.name })
    }

    const confirmDisconnect = async () => {
        if (!disconnectTarget) return

        setError(null)

        if (disconnectTarget.kind === "integration") {
            setDisconnectingId(disconnectTarget.id)
            try {
                await removeIntegration(disconnectTarget.id)
                await refetch()
                setDisconnectTarget(null)
            } catch {
                setError("Failed to disconnect integration")
            } finally {
                setDisconnectingId(null)
            }
            return
        }

        setDisconnectingMcpId(disconnectTarget.id)
        try {
            await disconnectMcpServer(disconnectTarget.id)
            await refetchMcpServers()
            setDisconnectTarget(null)
        } catch {
            setError("Failed to disconnect MCP server")
        } finally {
            setDisconnectingMcpId(null)
        }
    }

    React.useEffect(() => {
        const onFocus = () => {
            void refetch()
            void refetchMcpServers()
        }

        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [refetch, refetchMcpServers])

    if (agentLoading || (activeAgent && (integrationsLoading || mcpServersLoading))) {
        return (
            <div className="flex h-full items-center justify-center bg-background text-foreground">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!activeAgent) {
        return (
            <div className="flex h-full items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h2 className="text-xl font-normal mb-2">No Agent Selected</h2>
                    <p className="text-muted-foreground">Please select an agent to view integrations.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col h-full bg-background text-foreground">
                <div className="px-6 py-6 max-w-4xl mx-auto w-full">
                    <h1 className="text-2xl font-normal tracking-tight">Connections</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage external apps and MCP servers for <span className="text-foreground">{activeAgent.name}</span>.
                    </p>
                    {error && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 pb-10 space-y-6">
                    {displayedIntegrations.length === 0 && displayedMcpServers.length === 0 ? (
                        <div className="px-1 py-10 text-center text-sm text-muted-foreground">
                            No external apps or MCP servers are configured for this agent.
                        </div>
                    ) : null}

                    {displayedIntegrations.length > 0 ? (
                        <section>
                            <div className="flex items-center justify-between px-1 py-2">
                                <div className="space-y-0.5">
                                    <h2 className="text-sm font-normal">External Apps</h2>
                                    <p className="text-xs text-muted-foreground">Connect native app integrations for this agent.</p>
                                </div>
                                <span className="text-xs text-muted-foreground font-normal">
                                    {displayedIntegrations.filter((i) => i.is_active).length}/{displayedIntegrations.length} active
                                </span>
                            </div>

                            <div className="divide-y divide-border/30">
                                {displayedIntegrations.map((integration, index) => (
                                    <div
                                        key={integration.id}
                                        className={cn(
                                            "flex flex-col gap-3 px-1 py-3 md:flex-row md:items-center md:justify-between",
                                            index !== 0 && "",
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-normal text-muted-foreground">
                                                {integration.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-normal">{integration.name}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{integration.integration_type.replace("_", " ")}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <span className={cn(
                                                "inline-flex items-center rounded-md px-2 py-1 text-xs font-normal",
                                                integration.is_active
                                                    ? "bg-emerald-500/15 text-emerald-600"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                {integration.is_active ? "Active" : "Not connected"}
                                            </span>
                                            {integration.is_active ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onRequestDisconnectIntegration({ id: String(integration.id), name: integration.name })}
                                                    disabled={disconnectingId === String(integration.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-normal"
                                                >
                                                    {disconnectingId === String(integration.id) ? <Spinner size="sm" className="w-3 h-3" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    Disconnect
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleConnect(String(integration.id))}
                                                    disabled={connectingId === String(integration.id)}
                                                    className="font-normal"
                                                >
                                                    {connectingId === String(integration.id) ? <Spinner size="sm" className="w-3 h-3" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                                    Connect
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {displayedMcpServers.length > 0 ? (
                        <section>
                            <div className="flex items-center justify-between px-1 py-2">
                                <div className="space-y-0.5">
                                    <h2 className="text-sm font-normal">MCP Servers</h2>
                                    <p className="text-xs text-muted-foreground">Connect MCP servers for tool access in this context group.</p>
                                </div>
                                <span className="text-xs text-muted-foreground font-normal">
                                    {displayedMcpServers.filter((s) => s.is_active).length}/{displayedMcpServers.length} active
                                </span>
                            </div>

                            <div className="divide-y divide-border/30">
                                {displayedMcpServers.map((mcpServer, index) => (
                                    <div
                                        key={mcpServer.id}
                                        className={cn(
                                            "flex flex-col gap-3 px-1 py-3 md:flex-row md:items-center md:justify-between",
                                            index !== 0 && "",
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                <Server className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-normal">{mcpServer.name}</div>
                                                <div className="text-xs text-muted-foreground">MCP server</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <span className={cn(
                                                "inline-flex items-center rounded-md px-2 py-1 text-xs font-normal",
                                                mcpServer.is_active
                                                    ? "bg-emerald-500/15 text-emerald-600"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                {!mcpServer.requires_connection ? "Automatic" : mcpServer.is_active ? "Active" : "Not connected"}
                                            </span>
                                            {!mcpServer.requires_connection ? (
                                                <span className="text-xs text-muted-foreground">No connection needed</span>
                                            ) : mcpServer.is_active ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onRequestDisconnectMcp({ id: String(mcpServer.id), name: mcpServer.name })}
                                                    disabled={disconnectingMcpId === String(mcpServer.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-normal"
                                                >
                                                    {disconnectingMcpId === String(mcpServer.id) ? <Spinner size="sm" className="w-3 h-3" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    Disconnect
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleMcpConnect(String(mcpServer.id))}
                                                    disabled={connectingMcpId === String(mcpServer.id)}
                                                    className="font-normal"
                                                >
                                                    {connectingMcpId === String(mcpServer.id) ? <Spinner size="sm" className="w-3 h-3" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                                    Connect
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>

            <Dialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {disconnectTarget?.kind === "mcp" ? "Disconnect MCP Server" : "Disconnect Integration"}
                        </DialogTitle>
                        <DialogDescription>
                            This will disconnect {disconnectTarget?.name || "this connection"} for the current context group.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDisconnectTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDisconnect}
                            disabled={disconnectingId === disconnectTarget?.id || disconnectingMcpId === disconnectTarget?.id}
                        >
                            {disconnectingId === disconnectTarget?.id || disconnectingMcpId === disconnectTarget?.id ? (
                                <Spinner size="sm" className="w-3 h-3" />
                            ) : null}
                            Disconnect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
