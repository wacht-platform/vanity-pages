type CodedError = Error & { code?: string }

export function getReplayErrorDescription(error: unknown, fallback: string): string {
	const coded = error as CodedError
	switch (coded?.code) {
		case "REPLAY_MAX_IDS_EXCEEDED":
			return "Maximum 500 delivery IDs can be replayed in one request."
		case "REPLAY_DATE_WINDOW_EXCEEDED":
			return "Replay date range cannot exceed 48 hours."
		case "REPLAY_CONCURRENCY_EXCEEDED":
			return "Maximum 3 replay jobs can run at once for this app."
		default:
			if (error instanceof Error && error.message) return error.message
			return fallback
	}
}
