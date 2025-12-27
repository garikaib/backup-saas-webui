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
    disk_usage?: number
    active_backups?: number
    last_seen?: string
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
