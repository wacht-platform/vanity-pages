"use client"

import { useWebhookApp } from "@/components/webhook-provider"
import { EndpointConfigDialog } from "@/components/webhook/endpoint-config-dialog"

interface CreateEndpointDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	refetch: () => void
}

export function CreateEndpointDialog({ open, onOpenChange, refetch }: CreateEndpointDialogProps) {
	const { createEndpoint } = useWebhookApp()

	return (
		<EndpointConfigDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Add Endpoint"
			description="Configure where and how you would like to receive webhook notifications."
			submitLabel="Add Endpoint"
			submittingLabel="Adding Connection..."
			onSubmit={async (payload) => {
				await createEndpoint(payload)
			}}
			onSubmitted={refetch}
		/>
	)
}
