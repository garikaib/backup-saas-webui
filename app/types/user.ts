export interface UserCreate {
    email: string
    password: string
    full_name?: string
    is_active?: boolean
    role?: 'super_admin' | 'node_admin' | 'site_admin'
}

export interface UserUpdate {
    email?: string
    password?: string
    full_name?: string
    is_active?: boolean
    role?: 'super_admin' | 'node_admin' | 'site_admin'
}

export interface UserResponse {
    id: number
    email: string
    full_name: string | null
    is_active: boolean
    is_verified: boolean
    pending_email: string | null
    role: 'super_admin' | 'node_admin' | 'site_admin'
    assigned_nodes: number[]
    assigned_sites: number[]
    created_at?: string
}

export interface VerifyEmailRequest {
    code: string
    force_verify?: boolean
}

export interface VerifyEmailResponse {
    success: boolean
    message: string
}

// Node/Site Assignment Types
export interface NodeAssignment {
    id: number
    hostname: string
    ip_address: string
    status: string
}

export interface SiteAssignment {
    id: number
    name: string
    node_id: number
}

export interface NodeAssignmentRequest {
    node_ids: number[]
}

export interface SiteAssignmentRequest {
    site_ids: number[]
}

export interface AssignmentResponse {
    message: string
    assigned: number[]
}

