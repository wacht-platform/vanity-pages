"use client"

import * as React from "react"
import { useActiveAgent } from "@/components/agent-provider"
import { useAgentIntegrations } from "@wacht/nextjs"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertCircle, RefreshCw, Trash2, ExternalLink } from "lucide-react"
import type { AgentIntegration } from "@wacht/types"

export default function IntegrationsPage() {
    const { activeAgent, loading: agentLoading } = useActiveAgent()
    const { integrations: activeIntegrations, loading: integrationsLoading, generateConsentURL, removeIntegration, refetch } = useAgentIntegrations(activeAgent?.name || null)

    const [connectingId, setConnectingId] = React.useState<string | null>(null)
    const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const displayedIntegrations = React.useMemo(() => {
        if (!activeAgent?.integrations) return []

        return activeAgent.integrations.map(integration => {
            const isActive = activeIntegrations.some((ai: AgentIntegration) => ai.id === integration.id)
            return {
                ...integration,
                is_active: isActive
            }
        })
    }, [activeAgent, activeIntegrations])

    const handleConnect = async (integrationId: string) => {
        setConnectingId(integrationId)
        setError(null)
        try {
            const response = await generateConsentURL(integrationId)
            window.open(response.consent_url, "_blank")
            setConnectingId(null)
        } catch (err) {
            setError("Failed to initiate connection")
            setConnectingId(null)
        }
    }

    const handleDisconnect = async (integrationId: string) => {
        if (!confirm("Are you sure you want to disconnect this integration?")) return

        setDisconnectingId(integrationId)
        setError(null)
        try {
            await removeIntegration(integrationId)
            await refetch()
        } catch (err) {
            setError("Failed to disconnect integration")
        } finally {
            setDisconnectingId(null)
        }
    }

    React.useEffect(() => {
        const onFocus = () => {
            void refetch()
        }

        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [refetch])

    if (agentLoading || (activeAgent && integrationsLoading)) {
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
        <div className="flex flex-col h-full bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-background">
            <div className="flex items-center justify-between px-6 py-6 max-w-4xl mx-auto w-full">
                <div>
                    <h1 className="text-3xl font-serif text-foreground opacity-95">Integrations</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage connections for <span className="text-foreground font-medium">{activeAgent.name}</span>
                    </p>
                </div>
                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm px-3 py-1.5 rounded-md flex items-center gap-2 border border-destructive/20">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 pb-10 scrollbar-hide">
                {displayedIntegrations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-32 pb-20 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <p className="text-[15px]">No integrations available for this agent</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {displayedIntegrations.map((integration) => (
                            <div
                                key={integration.id}
                                className={cn(
                                    "p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[160px]",
                                    integration.is_active
                                        ? "bg-card border-emerald-500/30"
                                        : "bg-card border-border hover:border-muted-foreground/10"
                                )}
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {/* Icon Placeholder based on type or generic */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                                                integration.is_active ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                                            )}>
                                                {integration.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-foreground">{integration.name}</h3>
                                                <span className="text-xs text-muted-foreground capitalize">{integration.integration_type.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                        {integration.is_active && (
                                            <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        Connect your {integration.name} account to enable {activeAgent.name} to access and manage your data.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2 mt-auto border-t border-border">
                                    {integration.is_active ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDisconnect(String(integration.id))}
                                            disabled={disconnectingId === String(integration.id)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs gap-1.5"
                                        >
                                            {disconnectingId === String(integration.id) ? (
                                                <Spinner size="sm" className="w-3 h-3" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleConnect(String(integration.id))}
                                            disabled={connectingId === String(integration.id)}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-medium gap-1.5 px-4"
                                        >
                                            {connectingId === String(integration.id) ? (
                                                <Spinner size="sm" className="w-3 h-3" />
                                            ) : (
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            )}
                                            Connect
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
