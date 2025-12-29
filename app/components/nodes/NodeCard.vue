<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

const props = defineProps<{
    node: NodeResponse
}>()

const emit = defineEmits<{
    'click': [node: NodeResponse]
    'approve': [id: number]
}>()

// Computed stats that work with both streaming and REST data
const cpuPercent = computed(() => props.node.cpu_percent ?? props.node.cpu_usage ?? null)
const diskPercent = computed(() => props.node.disk_percent ?? props.node.disk_usage ?? null)
const memoryPercent = computed(() => props.node.memory_percent ?? props.node.memory_usage ?? null)
const activeBackups = computed(() => props.node.active_backups ?? 0)

// Status badge color
const statusColor = computed(() => {
    const status = props.node.status
    if (status === 'online' || status === 'active') return 'success'
    if (status === 'stale') return 'warning'
    if (status === 'offline' || status === 'blocked') return 'error'
    if (status === 'pending') return 'neutral'
    return 'neutral'
})

const statusLabel = computed(() => {
    const status = props.node.status
    if (status === 'online') return 'Online'
    if (status === 'active') return 'Active'
    if (status === 'stale') return 'Stale'
    if (status === 'offline') return 'Offline'
    if (status === 'blocked') return 'Blocked'
    if (status === 'pending') return 'Pending'
    return status
})

function getProgressColor(percent: number | null): string {
    if (percent === null) return 'bg-gray-300'
    if (percent > 90) return 'bg-red-500'
    if (percent > 75) return 'bg-yellow-500'
    return 'bg-blue-500'
}
</script>

<template>
    <UCard class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all duration-200 group" @click="emit('click', node)">
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                         <UIcon name="i-heroicons-server-stack" class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                         <span class="font-semibold text-lg text-gray-900 dark:text-white truncate">{{ node.hostname }}</span>
                         <UBadge v-if="node.is_master" color="primary" variant="subtle" size="xs">Master</UBadge>
                    </div>
                    <div class="text-sm text-gray-500 font-mono mt-1 truncate">{{ node.ip_address || 'IP not set' }}</div>
                </div>
                <UBadge :color="statusColor" variant="subtle" class="flex-shrink-0">{{ statusLabel }}</UBadge>
            </div>

            <!-- Pending Action -->
            <div v-if="node.status === 'pending'" class="py-2">
                <UButton block color="primary" label="Approve Node" icon="i-heroicons-check-circle" @click.stop="emit('approve', node.id)" />
            </div>

            <!-- Stats Bars -->
            <div v-else class="space-y-3">
                <!-- CPU -->
                <div class="space-y-1">
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>CPU</span>
                        <span :class="{'text-red-500': (cpuPercent || 0) > 80}">{{ cpuPercent !== null ? cpuPercent + '%' : 'N/A' }}</span>
                    </div>
                    <div class="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div v-if="cpuPercent !== null" class="h-full transition-all duration-500" :class="getProgressColor(cpuPercent)" :style="{ width: `${cpuPercent}%` }"></div>
                    </div>
                </div>

                <!-- Disk -->
                <div class="space-y-1">
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>Disk</span>
                        <span :class="{'text-red-500': (diskPercent || 0) > 80}">{{ diskPercent !== null ? diskPercent + '%' : 'N/A' }}</span>
                    </div>
                    <div class="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div v-if="diskPercent !== null" class="h-full transition-all duration-500" :class="getProgressColor(diskPercent)" :style="{ width: `${diskPercent}%` }"></div>
                    </div>
                </div>

                <!-- Memory (only show if available) -->
                <div v-if="memoryPercent !== null" class="space-y-1">
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>RAM</span>
                        <span :class="{'text-red-500': (memoryPercent || 0) > 80}">{{ memoryPercent }}%</span>
                    </div>
                    <div class="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full transition-all duration-500" :class="getProgressColor(memoryPercent)" :style="{ width: `${memoryPercent}%` }"></div>
                    </div>
                </div>
            </div>

             <!-- Footer Stats -->
             <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                 <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                     <div class="text-xs text-gray-500">Active Jobs</div>
                     <div class="font-semibold text-sm flex items-center justify-center gap-1">
                         <span v-if="activeBackups > 0" class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                         {{ activeBackups }}
                     </div>
                 </div>
                 <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                     <div class="text-xs text-gray-500">Last Seen</div>
                     <div class="font-semibold text-sm">
                         {{ node.last_seen ? new Date(node.last_seen).toLocaleTimeString() : (node.is_master ? 'Live' : 'Never') }}
                     </div>
                 </div>
             </div>
             <div class="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                <UIcon name="i-heroicons-cursor-arrow-rays" class="w-4 h-4" />
                <span>Click for details &amp; live metrics</span>
             </div>

        </div>
    </UCard>
</template>
