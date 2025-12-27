export interface NodeSimple {
    id: number
    hostname: string
}

export interface NodeResponse {
    id: number
    hostname: string
    ip_address: string | null
    status: 'pending' | 'active' | 'blocked'
    storage_quota_gb: number
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    disk_total_gb?: number
    disk_used_gb?: number
    active_backups?: number
    last_seen?: string
    // Advanced Metrics
    uptime_seconds?: number
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
