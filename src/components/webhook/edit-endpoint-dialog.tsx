"use client"

import { useWebhookApp } from "@/components/webhook-provider"
import { EndpointConfigDialog } from "@/components/webhook/endpoint-config-dialog"
import type { EndpointWithSubscriptions } from "@wacht/types"

interface EditEndpointDialogProps {
	endpoint: EndpointWithSubscriptions | null
	open: boolean
	onOpenChange: (open: boolean) => void
	refetch: () => void
}

export function EditEndpointDialog({ endpoint, open, onOpenChange, refetch }: EditEndpointDialogProps) {
	const { updateEndpoint } = useWebhookApp()

	return (
		<EndpointConfigDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Update Connection"
			description="Modify the configuration for this destination."
			submitLabel="Update Endpoint"
			submittingLabel="Updating..."
			initial={endpoint}
			onSubmit={async (payload) => {
				if (!endpoint) return
				await updateEndpoint(endpoint.id, payload)
			}}
			onSubmitted={refetch}
		/>
	)
}
