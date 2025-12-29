<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'

const props = defineProps<{
    node: NodeDetailResponse
}>()

function getGaugeColor(percent: number | null) {
    if (percent === null) return '#9ca3af' // gray
    if (percent > 90) return '#ef4444'
    if (percent > 75) return '#f59e0b'
    return '#3b82f6'
}

const radius = 30
const circumference = 2 * Math.PI * radius

function getDashOffset(percent: number | null) {
    if (percent === null) return circumference
    const val = Math.max(0, Math.min(100, percent))
    return circumference - (val / 100) * circumference
}

function formatUptime(seconds?: number | null) {
    if (!seconds) return 'Unknown'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h ${minutes}m`
}

// Computed stats that handle both streaming and legacy field names
const cpuPercent = computed(() => props.node.cpu_percent ?? props.node.cpu_usage ?? null)
const memoryPercent = computed(() => props.node.memory_percent ?? props.node.memory_usage ?? null)
const diskPercent = computed(() => props.node.disk_percent ?? props.node.disk_usage ?? null)
const activeBackups = computed(() => props.node.active_backups ?? 0)
const uptimeSeconds = computed(() => props.node.uptime_seconds ?? null)
</script>

<template>
    <div class="space-y-4">
        <!-- Top Row: Gauges & Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- CPU Gauge -->
            <UCard class="relative overflow-hidden">
                <div class="flex items-center justify-between mb-2 z-10 relative">
                     <div class="text-sm font-medium text-gray-500">CPU</div>
                     <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="flex items-center justify-center py-2 relative z-10">
                    <div class="relative w-24 h-24">
                        <svg class="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" :r="radius" stroke="currentColor" stroke-width="8" fill="transparent" class="text-gray-200 dark:text-gray-700" />
                            <circle v-if="cpuPercent !== null" cx="48" cy="48" :r="radius" :stroke="getGaugeColor(cpuPercent)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(cpuPercent)"
                            />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center flex-col">
                            <span class="text-xl font-bold">{{ cpuPercent !== null ? cpuPercent + '%' : 'N/A' }}</span>
                        </div>
                    </div>
                </div>
                <!-- Load Averages Footer -->
                <div v-if="node.load_avg" class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-center text-gray-500 flex justify-around">
                     <span title="1 min">{{ node.load_avg.one.toFixed(2) }}</span>
                     <span title="5 min">{{ node.load_avg.five.toFixed(2) }}</span>
                     <span title="15 min">{{ node.load_avg.fifteen.toFixed(2) }}</span>
                </div>
            </UCard>
    
            <!-- Memory Gauge (only show if available) -->
            <UCard v-if="memoryPercent !== null">
                <div class="flex items-center justify-between mb-2">
                     <div class="text-sm font-medium text-gray-500">RAM</div>
                     <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="flex items-center justify-center py-2">
                    <div class="relative w-24 h-24">
                        <svg class="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" :r="radius" stroke="currentColor" stroke-width="8" fill="transparent" class="text-gray-200 dark:text-gray-700" />
                            <circle cx="48" cy="48" :r="radius" :stroke="getGaugeColor(memoryPercent)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(memoryPercent)"
                            />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center flex-col">
                            <span class="text-xl font-bold">{{ memoryPercent }}%</span>
                        </div>
                    </div>
                </div>
                <div v-if="node.swap_percent !== undefined" class="mt-2 text-xs text-center text-gray-500">
                    Swap: {{ node.swap_percent }}%
                </div>
            </UCard>
    
            <!-- Disk Usage -->
            <UCard>
                <div class="flex items-center justify-between mb-4">
                     <div class="text-sm font-medium text-gray-500">Disk</div>
                     <UIcon name="i-heroicons-server" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between items-end">
                        <div>
                            <div class="text-2xl font-bold" v-if="node.disk_used_gb !== undefined">{{ node.disk_used_gb }}<span class="text-sm font-normal text-gray-500">GB</span></div>
                            <div class="text-2xl font-bold" v-else>{{ diskPercent !== null ? diskPercent + '%' : 'N/A' }}</div>
                        </div>
                        <div class="text-right" v-if="node.disk_total_gb">
                             <div class="text-xs text-gray-400">of {{ node.disk_total_gb }} GB</div>
                        </div>
                    </div>
                    <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div v-if="diskPercent !== null" class="h-full transition-all duration-500" :style="{ width: `${diskPercent}%`, backgroundColor: getGaugeColor(diskPercent) }"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>{{ diskPercent !== null ? diskPercent + '% Used' : 'N/A' }}</span>
                        <span>{{ node.disk_free_gb ? node.disk_free_gb + ' GB Free' : '' }}</span>
                    </div>
                </div>
            </UCard>
    
            <!-- Active Jobs -->
            <UCard>
                 <div class="flex items-center justify-between mb-4">
                     <div class="text-sm font-medium text-gray-500">Active Jobs</div>
                     <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-gray-400" />
                 </div>
                 <div class="flex items-center justify-center py-4">
                     <div class="text-center">
                         <div class="text-4xl font-bold" :class="activeBackups > 0 ? 'text-green-500' : 'text-gray-400'">
                             {{ activeBackups }}
                         </div>
                         <div class="text-xs text-gray-500 mt-1">
                             {{ activeBackups > 0 ? 'Running' : 'Idle' }}
                         </div>
                     </div>
                 </div>
            </UCard>
        </div>
        
        <!-- Bottom Stats Row -->
         <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
             <UCard v-if="uptimeSeconds !== null">
                 <div class="text-xs text-gray-500">Uptime</div>
                 <div class="font-semibold">{{ formatUptime(uptimeSeconds) }}</div>
             </UCard>
             <UCard v-if="node.network">
                 <div class="text-xs text-gray-500">Connections</div>
                 <div class="font-semibold">{{ node.network?.connections || 0 }}</div>
             </UCard>
             <UCard v-if="node.sites_count !== undefined">
                 <div class="text-xs text-gray-500">Sites</div>
                 <div class="font-semibold">{{ node.sites_count }}</div>
             </UCard>
             <UCard v-if="node.backups_count !== undefined">
                 <div class="text-xs text-gray-500">Backups</div>
                 <div class="font-semibold">{{ node.backups_count }}</div>
             </UCard>
         </div>
    </div>
</template>
