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
    role: 'super_admin' | 'node_admin' | 'site_admin'
}
