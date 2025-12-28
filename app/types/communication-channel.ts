export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'push'

export type MessageRole =
    | 'verification'
    | 'notification'
    | 'alert'
    | 'marketing'
    | 'transactional'
    | 'login_link'

export interface CommunicationChannel {
    id: number
    name: string
    channel_type: ChannelType
    provider: string
    allowed_roles: MessageRole[]
    is_default: boolean
    is_active: boolean
    priority: number
    config?: Record<string, any>
}

export interface ChannelCreate {
    name: string
    channel_type: ChannelType
    provider: string
    config: Record<string, any>
    allowed_roles: MessageRole[]
    is_default?: boolean
    priority?: number
}

export interface ChannelUpdate {
    name?: string
    config?: Record<string, any>
    allowed_roles?: MessageRole[]
    is_default?: boolean
    is_active?: boolean
    priority?: number
}

export interface ChannelTestRequest {
    to: string
}

export interface ChannelTestResponse {
    success: boolean
    message: string
    provider: string
}

export interface ChannelListResponse {
    channels: CommunicationChannel[]
    total: number
}

// Provider configurations
export interface SMTPConfig {
    host: string
    port: number
    encryption: 'tls' | 'ssl' | 'none'
    username: string
    password: string
    from_email: string
    from_name: string
}

export interface SendPulseConfig {
    client_id: string
    client_secret: string
    from_email: string
    from_name: string
}

export interface ConfigField {
    type: 'string' | 'integer' | 'boolean'
    required?: boolean
    secret?: boolean
    label?: string // Optional, can be derived from key
}

export interface ProviderSchema {
    channel_type: ChannelType
    provider_name: string
    config_schema: Record<string, ConfigField>
}

export interface ProviderListResponse {
    providers: ProviderSchema[]
}


export const MESSAGE_ROLES: { value: MessageRole; label: string }[] = [
    { value: 'verification', label: 'Verification' },
    { value: 'notification', label: 'Notification' },
    { value: 'alert', label: 'Alert' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'login_link', label: 'Login Link' }
]
