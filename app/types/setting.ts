export interface Setting {
    key: string
    value: string
    description: string | null
    updated_at: string
}

export interface SettingsListResponse {
    settings: Setting[]
}
