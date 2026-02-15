"use client"

import { toast as sonnerToast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type ToastKind = "success" | "error" | "info" | "default"

type ToastPayload = {
	title: string
	description?: string
	kind?: ToastKind
	durationMs?: number
}

export function toast(payload: ToastPayload) {
	const kind = payload.kind || "info"
	const options = {
		description: payload.description,
		duration: payload.durationMs || 3500,
	}

	if (kind === "success") {
		sonnerToast.success(payload.title, options)
		return
	}
	if (kind === "error") {
		sonnerToast.error(payload.title, options)
		return
	}
	if (kind === "default") {
		sonnerToast(payload.title, options)
		return
	}
	sonnerToast.info(payload.title, options)
}

export function ToastViewport() {
	return (
		<Toaster position="bottom-right" richColors closeButton />
	)
}
