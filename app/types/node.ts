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
