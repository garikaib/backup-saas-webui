import type { BackupStatus } from '~/types/site'

/**
 * Composable for managing backup status with SSE streaming support
 * Provides real-time backup progress updates with automatic fallback to polling
 */
export function useBackupStatus() {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    const client = useApiClient()

    // Active SSE connections by site ID
    const sseConnections = new Map<number, EventSource>()

    // Reactive backup statuses
    const statuses = ref<Record<number, BackupStatus>>({})

    // Polling intervals (fallback when SSE not available)
    const pollingIntervals = new Map<number, ReturnType<typeof setInterval>>()

    /**
     * Fetch backup status for a single site
     */
    async function fetchStatus(siteId: number): Promise<BackupStatus | null> {
        try {
            const status = await client<BackupStatus>(`/sites/${siteId}/backup/status`)
            statuses.value[siteId] = status
            return status
        } catch (error) {
            console.error(`Failed to fetch status for site ${siteId}`, error)
            return null
        }
    }

    /**
     * Fetch backup status for multiple sites
     */
    async function fetchStatusBatch(siteIds: number[]): Promise<void> {
        await Promise.allSettled(siteIds.map(id => fetchStatus(id)))
    }

    /**
     * Start SSE connection for real-time updates
     */
    function startSSE(siteId: number, onUpdate?: (status: BackupStatus) => void): void {
        // Close existing connection if any
        stopSSE(siteId)

        const token = authStore.token
        if (!token) {
            console.warn('No auth token available for SSE')
            startPolling(siteId)
            return
        }

        const baseUrl = config.public.apiBase
        const url = `${baseUrl}/daemon/backup/stream/${siteId}?token=${token}&interval=2`

        try {
            const source = new EventSource(url)
            sseConnections.set(siteId, source)

            source.onmessage = (event) => {
                try {
                    const data: BackupStatus = JSON.parse(event.data)
                    statuses.value[siteId] = data
                    onUpdate?.(data)

                    // Close connection on terminal states
                    if (['completed', 'failed', 'stopped'].includes(data.status)) {
                        stopSSE(siteId)
                    }
                } catch (e) {
                    console.error('Failed to parse SSE data', e)
                }
            }

            source.onerror = () => {
                console.warn(`SSE error for site ${siteId}, falling back to polling`)
                stopSSE(siteId)
                startPolling(siteId)
            }
        } catch (error) {
            console.warn(`Failed to establish SSE for site ${siteId}`, error)
            startPolling(siteId)
        }
    }

    /**
     * Stop SSE connection for a site
     */
    function stopSSE(siteId: number): void {
        const source = sseConnections.get(siteId)
        if (source) {
            source.close()
            sseConnections.delete(siteId)
        }
    }

    /**
     * Start polling fallback for a site
     */
    function startPolling(siteId: number): void {
        if (pollingIntervals.has(siteId)) return

        // Immediate check
        fetchStatus(siteId)

        const interval = setInterval(async () => {
            const status = await fetchStatus(siteId)
            if (status && ['completed', 'failed', 'stopped', 'idle'].includes(status.status)) {
                stopPolling(siteId)
            }
        }, 2000)

        pollingIntervals.set(siteId, interval)
    }

    /**
     * Stop polling for a site
     */
    function stopPolling(siteId: number): void {
        const interval = pollingIntervals.get(siteId)
        if (interval) {
            clearInterval(interval)
            pollingIntervals.delete(siteId)
        }
    }

    /**
     * Stop all monitoring (SSE and polling) for a site
     */
    function stopMonitoring(siteId: number): void {
        stopSSE(siteId)
        stopPolling(siteId)
    }

    /**
     * Start monitoring a site (SSE with polling fallback)
     */
    function startMonitoring(siteId: number): void {
        startSSE(siteId)
    }

    /**
     * Cleanup all connections
     */
    function cleanup(): void {
        sseConnections.forEach((_, siteId) => stopSSE(siteId))
        pollingIntervals.forEach((_, siteId) => stopPolling(siteId))
    }

    /**
     * Get status for a site
     */
    function getStatus(siteId: number): BackupStatus | undefined {
        return statuses.value[siteId]
    }

    /**
     * Check if a site has an active backup
     */
    function isRunning(siteId: number): boolean {
        return statuses.value[siteId]?.status === 'running'
    }

    // Cleanup on unmount
    onUnmounted(() => {
        cleanup()
    })

    return {
        statuses,
        fetchStatus,
        fetchStatusBatch,
        startSSE,
        stopSSE,
        startPolling,
        stopPolling,
        startMonitoring,
        stopMonitoring,
        cleanup,
        getStatus,
        isRunning
    }
}
