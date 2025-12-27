export interface Site {
    id: number
    uuid?: string
    name: string
    url?: string
    wp_path: string
    node_id?: number
    created_at?: string
    // Frontend helper props
    status?: 'active' | 'inactive' | 'archived'
    last_backup?: string
    storage_used_gb?: number
    storage_quota_gb?: number
    storage_used_bytes?: number
}

export type SiteResponse = Site

export interface SiteListResponse {
    sites: Site[]
    total: number
}

export interface SiteScanResult {
    name: string
    path: string
    has_wp_config: boolean
    has_wp_content: boolean
    db_name?: string
    db_user?: string
    db_host?: string
    table_prefix?: string
    is_complete: boolean
}

export interface ScanResponse {
    success: boolean
    sites: SiteScanResult[]
    total: number
    scanned_path: string
    node_id?: number
}

export interface BackupStatus {
    site_id: number
    site_name: string
    status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
    progress: number
    message: string
    error: string | null
    started_at?: string
}

export interface ImportSiteRequest {
    name: string
    wp_path: string
    db_name?: string
    node_id?: number
}

export interface ImportResponse {
    success: boolean
    message: string
    site: Site
}

export interface ManualAddRequest {
    path: string
    wp_config_path?: string
    node_id?: number
    name?: string
}

// Backup History Types
export interface Backup {
    id: number
    site_id: number
    site_name: string
    filename: string
    size_bytes: number
    size_gb: number
    s3_path: string
    created_at: string
    backup_type: 'full' | 'incremental'
    status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS'
    storage_provider: string
}

export interface BackupListResponse {
    backups: Backup[]
    total: number
}

export interface BackupDetailResponse extends Backup {
    storage_provider_detail?: {
        id: number
        name: string
        type: string
    }
}

export interface DownloadBackupResponse {
    backup_id: number
    filename: string
    s3_path: string
    provider: string
    download_url: string
    expires_in_seconds: number
}
