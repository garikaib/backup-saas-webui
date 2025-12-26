export interface BackupResponse {
    id: number
    site_id: number
    site_name: string
    filename: string
    size_gb: number
    created_at: string
    backup_type: 'full' | 'incremental'
    status: string
}

export interface BackupListResponse {
    backups: BackupResponse[]
    total: number
}
