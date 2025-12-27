<script setup lang="ts">
const client = useApiClient()

interface StorageHealth {
    healthy: boolean
    total_sites: number
    total_used_gb: number
    over_quota_count: number
    over_quota_sites: any[]
    warning_count: number
    warning_sites: any[]
    scheduled_deletions: number
    provider: {
        name: string
        bucket: string
        is_active: boolean
    }
}

const { data: health, pending, refresh } = await useLazyAsyncData<StorageHealth>('storage-health', () => 
    client('/storage/health')
)

const statusColor = computed(() => {
    if (!health.value) return 'neutral'
    if (!health.value.healthy) return 'error'
    if (health.value.warning_count > 0) return 'warning'
    return 'success'
})

const statusLabel = computed(() => {
    if (!health.value) return 'Unknown'
    if (!health.value.healthy) return 'Critical'
    if (health.value.warning_count > 0) return 'Warning'
    return 'Healthy'
})
</script>

<template>
    <UCard>
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-circle-stack" class="w-5 h-5 text-gray-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Storage Health</h3>
            </div>
            <UBadge :color="statusColor" variant="subtle" size="xs">
                <UIcon 
                    :name="health?.healthy ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'" 
                    class="w-3 h-3 mr-1" 
                />
                {{ statusLabel }}
            </UBadge>
        </div>

        <div v-if="pending" class="py-8 flex justify-center">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
        </div>

        <div v-else-if="health" class="space-y-4">
            <!-- Metrics Grid -->
            <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                    <div class="text-xs text-gray-500 mb-1">Total Used</div>
                    <div class="font-bold text-gray-900 dark:text-white text-lg">
                        {{ health.total_used_gb }} <span class="text-sm font-normal text-gray-400">GB</span>
                    </div>
                </div>
                <!-- Provider Info -->
                 <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                    <div class="text-xs text-gray-500 mb-1">Provider</div>
                    <div class="font-semibold text-gray-900 dark:text-white truncate text-sm flex items-center justify-center gap-1">
                        {{ health.provider?.name || 'Local' }}
                        <div v-if="health.provider?.is_active" class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                </div>
            </div>

            <!-- Alerts List -->
            <div class="space-y-2">
                <div v-if="health.over_quota_count > 0" class="flex items-center justify-between text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                    <span class="flex items-center gap-2">
                        <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" />
                        Sites Over Quota
                    </span>
                    <span class="font-bold">{{ health.over_quota_count }}</span>
                </div>
                
                <div v-if="health.warning_count > 0" class="flex items-center justify-between text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                    <span class="flex items-center gap-2">
                        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
                        Approaching Limit
                    </span>
                    <span class="font-bold">{{ health.warning_count }}</span>
                </div>

                <div v-if="health.scheduled_deletions > 0" class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 p-2">
                    <span class="flex items-center gap-2">
                        <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                        Pending Deletions
                    </span>
                    <span>{{ health.scheduled_deletions }}</span>
                </div>
            </div>
        </div>
        
        <div v-else class="text-center py-4 text-sm text-gray-500">
            Unable to load health status
        </div>
    </UCard>
</template>
