/**
 * Composable for streaming unified node stats via SSE
 */

export interface NodeStreamStats {
    id: number
    hostname: string
    status: 'online' | 'stale' | 'offline'
    is_master: boolean
    cpu_percent: number | null
    memory_percent: number | null
    disk_percent: number | null
    uptime_seconds: number | null
    active_backups: number
    last_seen: string | null
}

interface StreamResponse {
    timestamp: string
    nodes: NodeStreamStats[]
}

/**
 * Stream stats for ALL nodes
 */
export function useNodeStats(interval = 5) {
    const nodes = ref<NodeStreamStats[]>([])
    const connected = ref(false)
    const error = ref<string | null>(null)

    const authStore = useAuthStore()
    const config = useRuntimeConfig()

    let eventSource: EventSource | null = null

    function connect() {
        if (eventSource) {
            eventSource.close()
        }

        const token = authStore.token
        if (!token) {
            error.value = 'No authentication token'
            return
        }

        const apiBase = config.public.apiBase
        const url = `${apiBase}/metrics/nodes/stats/stream?token=${token}&interval=${interval}`

        try {
            eventSource = new EventSource(url)

            eventSource.onopen = () => {
                connected.value = true
                error.value = null
            }

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    // Handle connection message
                    if (data.event === 'connected') {
                        connected.value = true
                        return
                    }

                    // Handle error message
                    if (data.event === 'error') {
                        error.value = data.message
                        return
                    }

                    // Handle stats update
                    if (data.nodes) {
                        nodes.value = data.nodes
                    }
                } catch (e) {
                    console.error('[useNodeStats] Parse error:', e)
                }
            }

            eventSource.onerror = () => {
                connected.value = false
                error.value = 'Connection lost'
                // Auto-reconnect after 5 seconds
                setTimeout(() => {
                    if (!connected.value) {
                        connect()
                    }
                }, 5000)
            }
        } catch (e) {
            error.value = 'Failed to connect'
            console.error('[useNodeStats] Connection error:', e)
        }
    }

    function disconnect() {
        if (eventSource) {
            eventSource.close()
            eventSource = null
        }
        connected.value = false
    }

    onMounted(() => {
        connect()
    })

    onUnmounted(() => {
        disconnect()
    })

    return {
        nodes,
        connected,
        error,
        reconnect: connect
    }
}

/**
 * Stream stats for a SINGLE node (for detail modals)
 */
export function useSingleNodeStats(nodeId: Ref<number | null>, interval = 2) {
    const node = ref<NodeStreamStats | null>(null)
    const connected = ref(false)
    const error = ref<string | null>(null)

    const authStore = useAuthStore()
    const config = useRuntimeConfig()

    let eventSource: EventSource | null = null

    function connect() {
        if (eventSource) {
            eventSource.close()
        }

        if (!nodeId.value) {
            return
        }

        const token = authStore.token
        if (!token) {
            error.value = 'No authentication token'
            return
        }

        const apiBase = config.public.apiBase
        const url = `${apiBase}/metrics/nodes/${nodeId.value}/stats/stream?token=${token}&interval=${interval}`

        try {
            eventSource = new EventSource(url)

            eventSource.onopen = () => {
                connected.value = true
                error.value = null
            }

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    if (data.event === 'connected') {
                        connected.value = true
                        return
                    }

                    if (data.event === 'error') {
                        error.value = data.message
                        return
                    }

                    // Single node response
                    if (data.nodes && data.nodes.length > 0) {
                        node.value = data.nodes[0]
                    } else if (data.id) {
                        // Direct node object
                        node.value = data
                    }
                } catch (e) {
                    console.error('[useSingleNodeStats] Parse error:', e)
                }
            }

            eventSource.onerror = () => {
                connected.value = false
                error.value = 'Connection lost'
            }
        } catch (e) {
            error.value = 'Failed to connect'
        }
    }

    function disconnect() {
        if (eventSource) {
            eventSource.close()
            eventSource = null
        }
        connected.value = false
        node.value = null
    }

    // Watch for nodeId changes
    watch(nodeId, (newId, oldId) => {
        if (newId !== oldId) {
            disconnect()
            if (newId) {
                connect()
            }
        }
    }, { immediate: true })

    onUnmounted(() => {
        disconnect()
    })

    return {
        node,
        connected,
        error,
        reconnect: connect,
        disconnect
    }
}
