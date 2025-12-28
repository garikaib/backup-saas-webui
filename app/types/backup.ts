export interface BackupResponse {
    id: number
    site_id: number
    site_name: string
    filename: string
    size_gb: number
    size_bytes?: number
    s3_path?: string
    storage_provider?: string
    created_at: string
    backup_type: 'full' | 'incremental'
    status: string
}

export interface BackupListResponse {
    backups: BackupResponse[]
    total: number
}
