"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import type {
	CancelReplayTaskResponse,
	ReplayTaskStatusResponse,
} from "@wacht/types"

type FetchReplayTaskStatus = (options: { taskId: string }) => Promise<ReplayTaskStatusResponse>
type FetchReplayTasks = (options?: { limit?: number; offset?: number }) => Promise<{
	data: ReplayTaskStatusResponse[]
}>
type CancelReplayTask = (options: { taskId: string }) => Promise<CancelReplayTaskResponse>

type UseReplayJobsOptions = {
	fetchReplayTaskStatus: FetchReplayTaskStatus
	fetchReplayTasks: FetchReplayTasks
	cancelReplayTask: CancelReplayTask
	onTerminal?: () => void | Promise<void>
}

export function useReplayJobs({
	fetchReplayTaskStatus,
	fetchReplayTasks,
	cancelReplayTask,
	onTerminal,
}: UseReplayJobsOptions) {
	const [replayJobs, setReplayJobs] = useState<ReplayTaskStatusResponse[]>([])
	const pollingTaskIdsRef = useRef<Set<string>>(new Set())

	const pollReplayTask = useCallback(
		async (taskId: string, title: string) => {
			if (pollingTaskIdsRef.current.has(taskId)) return
			pollingTaskIdsRef.current.add(taskId)

			const maxAttempts = 45
			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 2000))
				try {
					const status = await fetchReplayTaskStatus({ taskId })
					setReplayJobs((prev) => {
						const existing = prev.find((job) => job.task_id === taskId)
						const merged: ReplayTaskStatusResponse = {
							task_id: taskId,
							app_slug: existing?.app_slug || "",
							status: status.status || "running",
							created_at: existing?.created_at,
							started_at: status.started_at || existing?.started_at,
							completed_at: status.completed_at || existing?.completed_at,
							total_count: status.total_count || 0,
							processed: status.processed || 0,
							replayed_count: status.replayed_count || 0,
							failed_count: status.failed_count || 0,
							last_delivery_id: status.last_delivery_id,
						}
						if (existing) return prev.map((job) => (job.task_id === taskId ? merged : job))
						return [merged, ...prev].slice(0, 50)
					})

					if (status.status === "completed" || status.status === "cancelled" || status.status === "failed") {
						if (status.status === "completed") {
							toast.success(`${title} completed`, {
								description: `Processed ${status.processed}/${status.total_count}. Replayed ${status.replayed_count}, failed ${status.failed_count}.`,
							})
						} else if (status.status === "cancelled") {
							toast(`${title} cancelled`, {
								description: `Processed ${status.processed}/${status.total_count}. Replayed ${status.replayed_count}, failed ${status.failed_count}.`,
							})
						} else {
							toast.error(`${title} failed`, {
								description: `Processed ${status.processed}/${status.total_count}. Replayed ${status.replayed_count}, failed ${status.failed_count}.`,
							})
						}
						if (onTerminal) await onTerminal()
						pollingTaskIdsRef.current.delete(taskId)
						return
					}
				} catch (error) {
					console.error("Failed to poll replay task status:", error)
					pollingTaskIdsRef.current.delete(taskId)
					return
				}
			}

			toast(`${title} in progress`, {
				description: "Still running in the background. You can refresh to see latest deliveries.",
			})
			pollingTaskIdsRef.current.delete(taskId)
		},
		[fetchReplayTaskStatus, onTerminal],
	)

	const startPollingActiveJobs = useCallback(
		(tasks: ReplayTaskStatusResponse[]) => {
			for (const task of tasks) {
				if (task.status === "queued" || task.status === "running") {
					void pollReplayTask(task.task_id, `Replay ${task.task_id}`)
				}
			}
		},
		[pollReplayTask],
	)

	const loadReplayJobs = useCallback(async () => {
		try {
			const result = await fetchReplayTasks({ limit: 50, offset: 0 })
			const tasks = result.data || []
			setReplayJobs(tasks)
			startPollingActiveJobs(tasks)
		} catch (error) {
			console.error("Failed to load replay tasks:", error)
		}
	}, [fetchReplayTasks, startPollingActiveJobs])

	const handleCancelReplayTask = useCallback(
		async (taskId: string) => {
			try {
				const result = await cancelReplayTask({ taskId })
				toast("Replay cancellation requested", { description: result.message })
				await loadReplayJobs()
			} catch (error) {
				console.error("Failed to cancel replay task:", error)
				toast.error("Cancel failed", { description: "Could not cancel replay task." })
			}
		},
		[cancelReplayTask, loadReplayJobs],
	)

	return {
		replayJobs,
		activeReplayCount: replayJobs.filter((job) => job.status === "queued" || job.status === "running").length,
		setReplayJobs,
		loadReplayJobs,
		pollReplayTask,
		handleCancelReplayTask,
	}
}
