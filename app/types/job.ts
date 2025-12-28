export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Job {
    id: string
    module: string
    target_id: number
    target_name: string
    status: JobStatus
    priority: number
    progress_percent: number
    created_at?: string
    updated_at?: string
    error?: string
}

export interface JobListResponse {
    jobs: Job[]
    total: number
}

export interface JobCreate {
    module: string
    target_id: number
    target_name?: string
    priority?: number
}

export interface JobModulesResponse {
    modules: string[]
}
