<script setup lang="ts">
import type { 
    LogEntry, 
    LogLevel, 
    LogListResponse, 
    LogFile, 
    LogFilesResponse,
    LogStatsResponse,
    LogLevelsResponse 
} from '~/types/system-log'

definePageMeta({
    layout: 'dashboard',
    middleware: 'auth'
})

useSeoMeta({ title: 'System Logs' })

const authStore = useAuthStore()
const config = useRuntimeConfig()

// Check Super Admin access
if (!authStore.isSuperAdmin) {
    navigateTo('/')
}

// Tabs
const activeTab = ref<'live' | 'files' | 'stats'>('live')

// Log entries state
const entries = ref<LogEntry[]>([])
const loading = ref(true)
const total = ref(0)
const limit = ref(50)

// Filters
const filterLevel = ref<LogLevel | undefined>()
const searchQuery = ref('')
const debouncedSearch = ref('')

// Log files state
const logFiles = ref<LogFile[]>([])
const filesLoading = ref(false)
const logDirectory = ref('')

// Stats state
const stats = ref<LogStatsResponse | null>(null)
const statsLoading = ref(false)

// Available levels
const levels = ref<LogLevel[]>(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
const currentLevel = ref<LogLevel>('INFO')

// Real-time streaming (using polling)
const isStreaming = ref(false)

const levelOptions = computed(() => [
    { label: 'All Levels', value: undefined },
    ...levels.value.map(l => ({ label: l, value: l }))
])

const limitOptions = [
    { label: '50 entries', value: 50 },
    { label: '100 entries', value: 100 },
    { label: '200 entries', value: 200 },
    { label: '500 entries', value: 500 }
]

// Debounce search
let searchTimeout: NodeJS.Timeout
watch(searchQuery, (val) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        debouncedSearch.value = val
    }, 300)
})

async function loadLogs() {
    loading.value = true
    try {
        let url = `/logs?limit=${limit.value}`
        if (filterLevel.value) url += `&level=${filterLevel.value}`
        if (debouncedSearch.value) url += `&search=${encodeURIComponent(debouncedSearch.value)}`

        const response = await $fetch<LogListResponse>(url, {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        entries.value = response.entries
        total.value = response.total
    } catch (error) {
        console.error('Failed to load logs:', error)
    } finally {
        loading.value = false
    }
}

async function loadLogFiles() {
    filesLoading.value = true
    try {
        const response = await $fetch<LogFilesResponse>('/logs/files', {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        logFiles.value = response.files
        logDirectory.value = response.log_directory
    } catch (error) {
        console.error('Failed to load log files:', error)
    } finally {
        filesLoading.value = false
    }
}

async function loadStats() {
    statsLoading.value = true
    try {
        const response = await $fetch<LogStatsResponse>('/logs/stats', {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        stats.value = response
    } catch (error) {
        console.error('Failed to load log stats:', error)
    } finally {
        statsLoading.value = false
    }
}

async function loadLevels() {
    try {
        const response = await $fetch<LogLevelsResponse>('/logs/levels', {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        levels.value = response.available_levels
        currentLevel.value = response.current_level
    } catch (error) {
        console.error('Failed to load log levels:', error)
    }
}

function downloadLogFile(filename: string) {
    // Create a link with proper auth - need to fetch and create blob
    fetchLogFileForDownload(filename)
}

async function fetchLogFileForDownload(filename: string) {
    try {
        const response = await fetch(`${config.public.apiBase}/logs/download/${filename}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        if (!response.ok) throw new Error('Download failed')
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    } catch (error) {
        console.error('Failed to download log file:', error)
    }
}

// Real-time SSE streaming (backend now supports ?token= query auth)
let eventSource: EventSource | null = null

function toggleStreaming() {
    if (isStreaming.value) {
        stopStreaming()
    } else {
        startStreaming()
    }
}

function startStreaming() {
    // Close existing connection
    if (eventSource) {
        eventSource.close()
    }

    // Connect to SSE stream with token as query param
    const url = `${config.public.apiBase}/logs/stream?token=${authStore.token}`
    eventSource = new EventSource(url)
    
    eventSource.onopen = () => {
        console.log('SSE stream connected')
        isStreaming.value = true
    }
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            
            // Handle connection event
            if (data.event === 'connected') {
                console.log('SSE:', data.message)
                return
            }
            
            // Handle log entry
            const entry = data as LogEntry
            if (entry.timestamp && entry.level && entry.message) {
                entries.value.unshift(entry)
                // Keep only last 200 entries in live view
                if (entries.value.length > 200) {
                    entries.value.pop()
                }
            }
        } catch (e) {
            console.error('Failed to parse SSE event:', e)
        }
    }

    eventSource.onerror = (e) => {
        console.error('SSE stream error:', e)
        stopStreaming()
    }
    
    isStreaming.value = true
}

function stopStreaming() {
    if (eventSource) {
        eventSource.close()
        eventSource = null
    }
    isStreaming.value = false
}

function getLevelColor(level: LogLevel) {
    const colors: Record<LogLevel, string> = {
        DEBUG: 'text-gray-400',
        INFO: 'text-blue-500',
        WARNING: 'text-yellow-500',
        ERROR: 'text-red-500',
        CRITICAL: 'text-red-700 font-bold'
    }
    return colors[level]
}

function getLevelBadgeColor(level: LogLevel): 'neutral' | 'info' | 'warning' | 'error' {
    const colors: Record<LogLevel, 'neutral' | 'info' | 'warning' | 'error'> = {
        DEBUG: 'neutral',
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'error'
    }
    return colors[level]
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString()
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Lifecycle
onMounted(() => {
    loadLogs()
    loadLevels()
})

onUnmounted(() => {
    stopStreaming()
})

watch([filterLevel, debouncedSearch, limit], loadLogs)

watch(activeTab, (tab) => {
    if (tab === 'files' && logFiles.value.length === 0) {
        loadLogFiles()
    } else if (tab === 'stats' && !stats.value) {
        loadStats()
    }
})
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold">System Logs</h1>
                <p class="text-gray-500 text-sm">Monitor daemon and server activity</p>
            </div>
            <div class="flex items-center gap-2">
                <UBadge :color="isStreaming ? 'success' : 'neutral'" variant="subtle">
                    <span class="flex items-center gap-1">
                        <span :class="isStreaming ? 'animate-pulse' : ''" class="w-2 h-2 rounded-full" :style="{ backgroundColor: isStreaming ? '#22c55e' : '#6b7280' }"></span>
                        {{ isStreaming ? 'Live' : 'Paused' }}
                    </span>
                </UBadge>
                <UButton 
                    :icon="isStreaming ? 'i-heroicons-pause' : 'i-heroicons-play'"
                    :color="isStreaming ? 'warning' : 'primary'"
                    variant="soft"
                    @click="toggleStreaming"
                >
                    {{ isStreaming ? 'Stop' : 'Stream' }}
                </UButton>
            </div>
        </div>

        <!-- Tabs -->
        <UTabs 
            :items="[
                { label: 'Live Logs', slot: 'live' },
                { label: 'Log Files', slot: 'files' },
                { label: 'Statistics', slot: 'stats' }
            ]"
            @change="(index: number) => activeTab = (['live', 'files', 'stats'] as const)[index] ?? 'live'"
        >
            <!-- Live Logs Tab -->
            <template #live>
                <div class="space-y-4 pt-4">
                    <!-- Filters -->
                    <div class="flex flex-wrap gap-4 items-center">
                        <UInput 
                            v-model="searchQuery"
                            icon="i-heroicons-magnifying-glass"
                            placeholder="Search logs..."
                            class="w-64"
                        />
                        <USelectMenu
                            v-model="filterLevel"
                            :items="levelOptions"
                            value-key="value"
                            class="w-40"
                            placeholder="Level"
                        />
                        <USelectMenu
                            v-model="limit"
                            :items="limitOptions"
                            value-key="value"
                            class="w-36"
                        />
                        <div class="flex-1"></div>
                        <UButton 
                            icon="i-heroicons-arrow-path" 
                            variant="ghost" 
                            @click="loadLogs"
                            :loading="loading"
                        >
                            Refresh
                        </UButton>
                        <div class="text-sm text-gray-500">
                            {{ total }} entries
                        </div>
                    </div>

                    <!-- Log Entries -->
                    <div class="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden font-mono text-sm">
                        <div v-if="loading" class="flex justify-center py-12">
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </div>

                        <div v-else-if="entries.length === 0" class="text-center py-12 text-gray-500">
                            No log entries found
                        </div>

                        <div v-else class="max-h-[600px] overflow-y-auto">
                            <div 
                                v-for="(entry, index) in entries" 
                                :key="index"
                                class="px-4 py-2 border-b border-gray-800 hover:bg-gray-800/50 flex gap-4"
                            >
                                <span class="text-gray-500 text-xs whitespace-nowrap">
                                    {{ formatDate(entry.timestamp) }}
                                </span>
                                <UBadge 
                                    :color="getLevelBadgeColor(entry.level)" 
                                    size="xs"
                                    class="w-16 justify-center"
                                >
                                    {{ entry.level }}
                                </UBadge>
                                <span class="text-gray-400 text-xs truncate max-w-[150px]" :title="entry.logger">
                                    {{ entry.module }}
                                </span>
                                <span :class="getLevelColor(entry.level)" class="flex-1 break-words">
                                    {{ entry.message }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Log Files Tab -->
            <template #files>
                <div class="space-y-4 pt-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">
                            Directory: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ logDirectory }}</code>
                        </div>
                        <UButton 
                            icon="i-heroicons-arrow-path" 
                            variant="ghost" 
                            @click="loadLogFiles"
                            :loading="filesLoading"
                        >
                            Refresh
                        </UButton>
                    </div>

                    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div v-if="filesLoading" class="flex justify-center py-12">
                            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                        </div>

                        <table v-else class="w-full">
                            <thead class="bg-gray-50 dark:bg-gray-800 text-left text-sm text-gray-500">
                                <tr>
                                    <th class="px-4 py-3">Filename</th>
                                    <th class="px-4 py-3">Size</th>
                                    <th class="px-4 py-3">Last Modified</th>
                                    <th class="px-4 py-3 w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                                <tr 
                                    v-for="file in logFiles" 
                                    :key="file.name"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-gray-400" />
                                            <span class="font-mono text-sm">{{ file.name }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-500">
                                        {{ formatBytes(file.size_bytes) }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-500">
                                        {{ formatDate(file.modified) }}
                                    </td>
                                    <td class="px-4 py-3">
                                        <UButton 
                                            icon="i-heroicons-arrow-down-tray" 
                                            size="xs" 
                                            variant="ghost"
                                            @click="downloadLogFile(file.name)"
                                        >
                                            Download
                                        </UButton>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>

            <!-- Statistics Tab -->
            <template #stats>
                <div class="space-y-6 pt-4">
                    <div v-if="statsLoading" class="flex justify-center py-12">
                        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
                    </div>

                    <template v-else-if="stats">
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                                <div class="text-sm text-gray-500">Log Files</div>
                                <div class="text-2xl font-bold">{{ stats.file_count }}</div>
                            </div>
                            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                                <div class="text-sm text-gray-500">Total Size</div>
                                <div class="text-2xl font-bold">{{ stats.total_size_mb.toFixed(2) }} MB</div>
                            </div>
                            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                                <div class="text-sm text-gray-500">Current Level</div>
                                <div class="text-2xl font-bold">{{ currentLevel }}</div>
                            </div>
                            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                                <div class="text-sm text-gray-500">Directory</div>
                                <div class="text-sm font-mono truncate" :title="stats.log_directory">{{ stats.log_directory }}</div>
                            </div>
                        </div>

                        <!-- Entries by Level -->
                        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                            <h3 class="text-lg font-semibold mb-4">Recent Entries by Level</h3>
                            <div class="grid grid-cols-5 gap-4">
                                <div 
                                    v-for="level in levels" 
                                    :key="level"
                                    class="text-center"
                                >
                                    <div class="text-3xl font-bold" :class="getLevelColor(level)">
                                        {{ stats.recent_entries_by_level[level] || 0 }}
                                    </div>
                                    <div class="text-sm text-gray-500">{{ level }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end">
                            <UButton 
                                icon="i-heroicons-arrow-path" 
                                variant="soft" 
                                @click="loadStats"
                            >
                                Refresh Stats
                            </UButton>
                        </div>
                    </template>
                </div>
            </template>
        </UTabs>
    </div>
</template>
