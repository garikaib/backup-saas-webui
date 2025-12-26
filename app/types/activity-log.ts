export interface ActivityLog {
    id: number
    user_id: number
    user_email: string
    action: 'login' | 'login_failed' | 'user_create' | 'user_update' | 'user_delete' | 'profile_update' | 'node_approve' | 'node_quota_update' | 'backup_delete'
    target_type: string | null
    target_id: number | null
    target_name: string | null
    details: string | null
    ip_address: string
    user_agent: string
    created_at: string
}

export interface ActivityLogListResponse {
    logs: ActivityLog[]
    total: number
}
