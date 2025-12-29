export interface NodeSimple {
    id: number
    hostname: string
}

export interface NodeStats {
    cpu_usage: number
    disk_usage: number
    active_backups: number
}

// Streaming stats from SSE endpoint
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

export interface NodeResponse {
    id: number
    hostname: string
    ip_address: string | null
    status: 'pending' | 'active' | 'blocked' | 'online' | 'stale' | 'offline'
    storage_quota_gb: number
    stats?: NodeStats[]
    // Streaming fields (from SSE)
    is_master?: boolean
    cpu_percent?: number | null
    memory_percent?: number | null
    disk_percent?: number | null
    // Legacy fields (optional/deprecated)
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    disk_total_gb?: number
    disk_used_gb?: number
    disk_free_gb?: number
    storage_used_gb?: number
    active_backups?: number
    last_seen?: string | null
    // Advanced Metrics
    uptime_seconds?: number | null
    load_avg?: {
        one: number
        five: number
        fifteen: number
    }
    ram_total_bytes?: number
    ram_used_bytes?: number
    swap_percent?: number
    network?: {
        bytes_sent: number
        bytes_recv: number
        connections: number
    }
}

export interface NodeDetailResponse extends NodeResponse {
    total_available_gb: number
    storage_used_gb: number
    sites_count: number
    backups_count: number
}

export interface NodeQuotaUpdate {
    storage_quota_gb: number
}
