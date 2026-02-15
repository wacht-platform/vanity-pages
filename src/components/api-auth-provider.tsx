"use client";

import React, { createContext, useContext } from "react";
import { useApiAuthAppSession } from "@wacht/nextjs";
import { ApiAuthAppInfo } from "@wacht/types";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ApiAuthAppContextType {
	apiAuthApp: ApiAuthAppInfo | null;
	loading: boolean;
	hasSession: boolean;
	sessionError: Error | null;
	sessionId: string | null;
}

const ApiAuthAppContext = createContext<ApiAuthAppContextType | undefined>(undefined);

export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const ticket = searchParams?.get("ticket");

	const {
		hasSession,
		sessionLoading,
		sessionError,
		sessionId,
		apiAuthApp,
		ticketExchanged
	} = useApiAuthAppSession(ticket);

	useEffect(() => {
		if (ticket && ticketExchanged) {
			router.replace(pathname);
		}
	}, [ticket, ticketExchanged, router, pathname]);

	return (
		<ApiAuthAppContext.Provider value={{
			apiAuthApp,
			loading: sessionLoading,
			hasSession,
			sessionError,
			sessionId
		}}>
			{children}
		</ApiAuthAppContext.Provider>
	);
}

export function useApiAuth() {
	const context = useContext(ApiAuthAppContext);
	if (context === undefined) {
		throw new Error("useApiAuth must be used within an ApiAuthProvider");
	}
	return context;
}
