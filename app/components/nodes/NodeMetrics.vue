<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'

const props = defineProps<{
    node: NodeDetailResponse
}>()

function getGaugeColor(percent: number) {
    if (percent > 90) return '#ef4444'
    if (percent > 75) return '#f59e0b'
    return '#3b82f6'
}

const radius = 30
const circumference = 2 * Math.PI * radius

function getDashOffset(percent: number) {
    const val = Math.max(0, Math.min(100, percent))
    return circumference - (val / 100) * circumference
}

function formatBytes(bytes?: number) {
    if (!bytes) return '0 B'
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
}

function formatUptime(seconds?: number) {
    if (!seconds) return 'Unknown'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h ${minutes}m`
}

// Network Graph Logic
const networkHistory = ref<{ time: number, rx_speed: number, tx_speed: number }[]>([])
const lastNetwork = ref<{ bytes_sent: number, bytes_recv: number, time: number } | null>(null)

watch(() => props.node.network, (newVal) => {
    if (!newVal) return
    
    const now = Date.now()
    if (lastNetwork.value) {
        const timeDiff = (now - lastNetwork.value.time) / 1000 // seconds
        if (timeDiff > 0) {
            const rx_diff = newVal.bytes_recv - lastNetwork.value.bytes_recv
            const tx_diff = newVal.bytes_sent - lastNetwork.value.bytes_sent
            
            // Push calculated speed (Bytes/s)
            networkHistory.value.push({
                time: now,
                rx_speed: Math.max(0, rx_diff / timeDiff),
                tx_speed: Math.max(0, tx_diff / timeDiff)
            })
            
            // Keep last 30 points (approx 1 min if 2s interval)
            if (networkHistory.value.length > 30) {
                networkHistory.value.shift()
            }
        }
    }
    
    lastNetwork.value = {
        bytes_sent: newVal.bytes_sent,
        bytes_recv: newVal.bytes_recv,
        time: now
    }
}, { deep: true })

// Generate SVG Path for Network Graph
const graphPathRx = computed(() => generatePath('rx_speed'))
const graphPathTx = computed(() => generatePath('tx_speed'))

function generatePath(key: 'rx_speed' | 'tx_speed') {
    if (networkHistory.value.length < 2) return ''
    
    const height = 60 // Viewport height
    const width = 300 // Viewport width
    
    const maxVal = Math.max(...networkHistory.value.map(p => p.rx_speed || 0), ...networkHistory.value.map(p => p.tx_speed || 0), 1024) // Min 1KB scale
    
    const stepX = width / (networkHistory.value.length - 1)
    
    const points = networkHistory.value.map((point, index) => {
        const x = index * stepX
        // Invert Y (SVG 0 is top)
        const val = point[key]
        const y = height - ((val / maxVal) * height) 
        return `${x},${y}`
    })
    
    return `M ${points.join(' L ')}`
}

const currentRx = computed(() => networkHistory.value.length > 0 ? networkHistory.value[networkHistory.value.length-1]?.rx_speed ?? 0 : 0)
const currentTx = computed(() => networkHistory.value.length > 0 ? networkHistory.value[networkHistory.value.length-1]?.tx_speed ?? 0 : 0)

</script>

<template>
    <div class="space-y-4">
        <!-- Top Row: Gauges & Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- CPU Gauge -->
            <UCard class="relative overflow-hidden">
                <div class="flex items-center justify-between mb-2 z-10 relative">
                     <div class="text-sm font-medium text-gray-500">CPU Load</div>
                     <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="flex items-center justify-center py-2 relative z-10">
                    <div class="relative w-24 h-24">
                        <svg class="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" :r="radius" stroke="currentColor" stroke-width="8" fill="transparent" class="text-gray-200 dark:text-gray-700" />
                            <circle v-if="node.cpu_usage !== undefined" cx="48" cy="48" :r="radius" :stroke="getGaugeColor(node.cpu_usage)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(node.cpu_usage)"
                            />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center flex-col">
                            <span class="text-xl font-bold">{{ node.cpu_usage !== undefined ? node.cpu_usage + '%' : 'N/A' }}</span>
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
    
            <!-- Memory Gauge -->
            <UCard v-if="node.memory_usage !== undefined">
                <div class="flex items-center justify-between mb-2">
                     <div class="text-sm font-medium text-gray-500">RAM Usage</div>
                     <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="flex items-center justify-center py-2">
                    <div class="relative w-24 h-24">
                        <svg class="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" :r="radius" stroke="currentColor" stroke-width="8" fill="transparent" class="text-gray-200 dark:text-gray-700" />
                            <circle v-if="node.memory_usage !== undefined" cx="48" cy="48" :r="radius" :stroke="getGaugeColor(node.memory_usage)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(node.memory_usage)"
                            />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center flex-col">
                            <span class="text-xl font-bold">{{ node.memory_usage !== undefined ? node.memory_usage + '%' : 'N/A' }}</span>
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
                     <div class="text-sm font-medium text-gray-500">Storage Usage</div>
                     <UIcon name="i-heroicons-server" class="w-5 h-5 text-gray-400" />
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between items-end">
                        <div>
                            <div class="text-2xl font-bold" v-if="node.disk_used_gb !== undefined">{{ node.disk_used_gb }}<span class="text-sm font-normal text-gray-500">GB</span></div>
                            <div class="text-2xl font-bold" v-else>{{ node.disk_usage !== undefined ? node.disk_usage + '%' : 'N/A' }}</div>
                        </div>
                        <div class="text-right" v-if="node.disk_total_gb">
                             <div class="text-xs text-gray-400">of {{ node.disk_total_gb }} GB Total</div>
                        </div>
                    </div>
                    <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div v-if="node.disk_usage !== undefined" class="h-full transition-all duration-500" :style="{ width: `${node.disk_usage}%`, backgroundColor: getGaugeColor(node.disk_usage) }"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>{{ node.disk_usage !== undefined ? node.disk_usage + '% Usage' : 'N/A' }}</span>
                        <span>{{ node.disk_free_gb ? node.disk_free_gb + ' GB Free' : '' }}</span>
                    </div>
                </div>
            </UCard>
    
            <!-- Network & Uptime -->
            <UCard v-if="node.network">
                 <div class="flex items-center justify-between mb-4">
                     <div class="text-sm font-medium text-gray-500">Network Flow</div>
                     <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-gray-400" />
                 </div>
                 <div class="space-y-4">
                     <!-- Graph -->
                     <div class="h-16 w-full bg-gray-50 dark:bg-gray-800 rounded relative overflow-hidden flex items-end">
                         <svg v-if="networkHistory.length > 1" class="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                             <!-- Rx Line (Green-ish) -->
                             <path :d="graphPathRx" fill="none" stroke="#10b981" stroke-width="2" class="opacity-80" />
                             <!-- Tx Line (Blue-ish) -->
                             <path :d="graphPathTx" fill="none" stroke="#3b82f6" stroke-width="2" class="opacity-80" />
                         </svg>
                         <div v-else class="w-full text-center text-xs text-gray-400 pb-2">Waiting for data...</div>
                     </div>
                     
                     <div class="grid grid-cols-2 gap-2 text-xs">
                         <div>
                             <div class="text-gray-500">Rx</div>
                             <div class="font-mono text-green-500">{{ formatBytes(currentRx) }}/s</div>
                         </div>
                         <div class="text-right">
                             <div class="text-gray-500">Tx</div>
                             <div class="font-mono text-blue-500">{{ formatBytes(currentTx) }}/s</div>
                         </div>
                     </div>
                 </div>
            </UCard>
        </div>
        
        <!-- Bottom Stats Row -->
         <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
             <UCard v-if="node.uptime_seconds">
                 <div class="text-xs text-gray-500">Uptime</div>
                 <div class="font-semibold">{{ formatUptime(node.uptime_seconds) }}</div>
             </UCard>
             <UCard v-if="node.network">
                 <div class="text-xs text-gray-500">Connections</div>
                 <div class="font-semibold">{{ node.network?.connections || 0 }}</div>
             </UCard>
             <UCard>
                 <div class="text-xs text-gray-500">Active Jobs</div>
                 <div class="font-semibold text-primary-500">{{ node.active_backups || 0 }}</div>
             </UCard> 
             <UCard v-if="node.ram_total_bytes">
                 <div class="text-xs text-gray-500">Memory Total</div>
                 <div class="font-semibold">{{ formatBytes(node.ram_total_bytes) }}</div>
             </UCard>
         </div>
    </div>
</template>
