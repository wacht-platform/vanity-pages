"use client";

import React, { createContext, useContext } from "react";
import { useWebhookAppSession } from "@wacht/nextjs";
import type {
	WebhookAppInfo,
	CreateEndpointOptions,
	UpdateEndpointOptions,
	DeleteEndpointResponse,
	TestEndpointOptions,
	TestEndpointResponse,
	EndpointWithSubscriptions,
	ReplayWebhookDeliveryOptions,
	ReplayWebhookDeliveryResponse,
	CancelReplayTaskOptions,
	CancelReplayTaskResponse,
	ReplayTaskListOptions,
	ReplayTaskListResponse,
	ReplayTaskStatusOptions,
	ReplayTaskStatusResponse,
	WebhookDeliveryDetail
} from "@wacht/types";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface WebhookAppContextType {
	webhookApp: WebhookAppInfo | null;
	loading: boolean;
	hasSession: boolean;
	sessionError: Error | null;
	sessionId: string | null;
	reload: () => Promise<void>;
	createEndpoint: (options: CreateEndpointOptions) => Promise<EndpointWithSubscriptions>;
	updateEndpoint: (endpointId: string, options: UpdateEndpointOptions) => Promise<EndpointWithSubscriptions>;
	deleteEndpoint: (endpointId: string) => Promise<DeleteEndpointResponse>;
	testEndpoint: (endpointId: string, options: TestEndpointOptions) => Promise<TestEndpointResponse>;
	rotateSecret: () => Promise<WebhookAppInfo>;
	replayDelivery: (options: ReplayWebhookDeliveryOptions) => Promise<ReplayWebhookDeliveryResponse>;
	cancelReplayTask: (options: CancelReplayTaskOptions) => Promise<CancelReplayTaskResponse>;
	fetchReplayTaskStatus: (options: ReplayTaskStatusOptions) => Promise<ReplayTaskStatusResponse>;
	fetchReplayTasks: (options?: ReplayTaskListOptions) => Promise<ReplayTaskListResponse>;
	fetchDeliveryDetail: (deliveryId: string) => Promise<WebhookDeliveryDetail[]>;
}

const WebhookAppContext = createContext<WebhookAppContextType | undefined>(undefined);

export function WebhookAppProvider({ children }: { children: React.ReactNode }) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const ticket = searchParams?.get("ticket");

	const {
		hasSession,
		sessionLoading,
		sessionError,
		sessionId,
		webhookApp,
		ticketExchanged,
		refetch,
		createEndpoint,
		updateEndpoint,
		deleteEndpoint,
		testEndpoint,
		rotateSecret,
		replayDelivery,
		cancelReplayTask,
		fetchReplayTaskStatus,
		fetchReplayTasks,
		fetchDeliveryDetail
	} = useWebhookAppSession(ticket);

	useEffect(() => {
		if (ticket && ticketExchanged) {
			router.replace(pathname);
		}
	}, [ticket, ticketExchanged, router, pathname]);

	return (
		<WebhookAppContext.Provider value={{
			webhookApp,
			loading: sessionLoading,
			hasSession,
			sessionError,
			sessionId,
			reload: refetch,
			createEndpoint,
			updateEndpoint,
			deleteEndpoint,
			testEndpoint,
			rotateSecret,
			replayDelivery,
			cancelReplayTask,
			fetchReplayTaskStatus,
			fetchReplayTasks,
			fetchDeliveryDetail
		}}>
			{children}
		</WebhookAppContext.Provider>
	);
}

export function useWebhookApp() {
	const context = useContext(WebhookAppContext);
	if (context === undefined) {
		throw new Error("useWebhookApp must be used within a WebhookAppProvider");
	}
	return context;
}
