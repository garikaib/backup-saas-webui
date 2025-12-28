export type StorageProviderType = 's3' | 'b2' | 'mega' | 'local'

export interface StorageProvider {
    id: number
    name: string
    type: StorageProviderType
    bucket: string | null
    region: string | null
    endpoint: string | null
    used_gb: number
    storage_limit_gb?: number
    is_default: boolean
    created_at: string
}

export interface StorageProviderCreate {
    name: string
    type: StorageProviderType
    bucket?: string
    region?: string
    endpoint?: string
    access_key?: string
    secret_key?: string
    storage_limit_gb?: number
    is_default?: boolean
}

export interface StorageProviderUpdate {
    name?: string
    bucket?: string
    region?: string
    endpoint?: string
    access_key?: string
    secret_key?: string
    storage_limit_gb?: number
    is_default?: boolean
}

export interface NodeStorageSummary {
    node_id: number
    hostname: string
    quota_gb: number
    used_gb: number
    available_gb: number
    usage_percentage: number
    status: 'pending' | 'active' | 'blocked'
}

export interface StorageSummary {
    total_quota_gb: number
    total_used_gb: number
    total_available_gb: number
    usage_percentage: number
    nodes_count: number
    nodes_summary: NodeStorageSummary[]
    storage_providers: StorageProvider[]
}

export interface StorageProvidersListResponse {
    providers: StorageProvider[]
}
