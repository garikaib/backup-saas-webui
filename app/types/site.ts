export interface SiteSimple {
    id: number
    name: string
    node_id: number
}

export interface SiteResponse {
    id: number
    name: string
    wp_path: string
    db_name: string | null
    node_id: number
    status: string
    storage_used_gb: number
    last_backup: string | null
}

export interface SiteListResponse {
    sites: SiteResponse[]
    total: number
}
