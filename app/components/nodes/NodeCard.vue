<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

const props = defineProps<{
    node: NodeResponse
}>()

const emit = defineEmits<{
    'click': [node: NodeResponse]
    'approve': [id: number]
}>()

function formatTime(dateStr?: string) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getUsageColor(percent?: number) {
    if (!percent) return 'primary'
    if (percent > 90) return 'error'
    if (percent > 75) return 'warning'
    return 'primary'
}
</script>

<template>
    <UCard class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all duration-200 group" @click="emit('click', node)">
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                         <UIcon name="i-heroicons-server" class="w-5 h-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
                         <span class="font-semibold text-lg text-gray-900 dark:text-white truncate">{{ node.hostname }}</span>
                    </div>
                    <div class="text-sm text-gray-500 font-mono mt-1">{{ node.ip_address || 'No IP' }}</div>
                </div>
                <NodeStatusBadge :status="node.status" />
            </div>

            <!-- Pending Action -->
            <div v-if="node.status === 'pending'" class="py-2">
                <UButton block color="primary" label="Approve Node" @click.stop="emit('approve', node.id)" />
            </div>

            <!-- Stats Grid -->
            <template v-else>
                 <!-- Resources -->
                 <div class="space-y-3 pt-2">
                    <div class="space-y-1">
                        <div class="flex justify-between text-xs text-gray-500">
                             <span>CPU</span>
                             <span>{{ node.cpu_usage || 0 }}%</span>
                        </div>
                        <UProgress :value="node.cpu_usage || 0" :color="getUsageColor(node.cpu_usage)" size="xs" />
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between text-xs text-gray-500">
                             <span>Disk</span>
                             <span>{{ node.disk_usage || 0 }}%</span>
                        </div>
                        <UProgress :value="node.disk_usage || 0" :color="getUsageColor(node.disk_usage)" size="xs" />
                    </div>
                 </div>

                 <!-- Footer Stats -->
                 <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                     <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                         <div class="text-xs text-gray-500">Quota</div>
                         <div class="font-semibold text-sm">{{ node.storage_quota_gb }} GB</div>
                     </div>
                     <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                         <div class="text-xs text-gray-500">Active Jobs</div>
                         <div class="font-semibold text-sm flex items-center justify-center gap-1">
                             <span v-if="node.active_backups" class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             {{ node.active_backups || 0 }}
                         </div>
                     </div>
                 </div>

                 <div class="text-xs text-right text-gray-400">
                    Last seen: {{ formatTime(node.last_seen) }}
                 </div>
            </template>
        </div>
    </UCard>
</template>
