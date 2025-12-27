// System Logs types - for daemon/server logs (Super Admin only)

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface LogEntry {
    timestamp: string
    level: LogLevel
    logger: string
    message: string
    module: string
    function: string
    line: number
}

export interface LogListResponse {
    entries: LogEntry[]
    total: number
    filters: {
        level: LogLevel | null
        search: string | null
    }
}

export interface LogFile {
    name: string
    size_bytes: number
    modified: string
}

export interface LogFilesResponse {
    log_directory: string
    files: LogFile[]
    total: number
}

export interface LogSearchResponse {
    query: string
    entries: LogEntry[]
    total: number
}

export interface LogStatsResponse {
    file_count: number
    total_size_bytes: number
    total_size_mb: number
    recent_entries_by_level: Record<LogLevel, number>
    log_directory: string
}

export interface LogLevelsResponse {
    current_level: LogLevel
    available_levels: LogLevel[]
}
