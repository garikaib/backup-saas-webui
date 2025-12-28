<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

const props = defineProps<{
    node: NodeResponse
}>()

const emit = defineEmits<{
    'click': [node: NodeResponse]
    'approve': [id: number]
}>()
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
                    </div>
                    <div class="text-sm text-gray-500 font-mono mt-1 truncate">{{ node.ip_address || 'IP not set' }}</div>
                </div>
                <NodesNodeStatusBadge :status="node.status" class="flex-shrink-0" />
            </div>

            <!-- Pending Action -->
            <div v-if="node.status === 'pending'" class="py-2">
                <UButton block color="primary" label="Approve Node" icon="i-heroicons-check-circle" @click.stop="emit('approve', node.id)" />
            </div>

                <!-- Resources -->
                 <div class="space-y-3 pt-2">
                     <div class="px-1">
                        <QuotaProgressBar 
                            label="Storage Quota" 
                            :usage-gb="node.storage_used_gb || (node.disk_usage ? (node.disk_usage / 100 * node.storage_quota_gb) : 0)" 
                            :quota-gb="node.storage_quota_gb"
                            :show-value="true"
                        />
                     </div>
                 </div>

                 <!-- Footer Stats -->
                 <div class="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                     <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                         <div class="text-xs text-gray-500">ID</div>
                         <div class="font-semibold text-sm">#{{ node.id }}</div>
                     </div>
                     <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                         <div class="text-xs text-gray-500">CPU</div>
                         <div class="font-semibold text-sm" :class="{'text-red-500': (node.cpu_usage || 0) > 80}">
                             {{ node.cpu_usage !== undefined ? node.cpu_usage + '%' : 'N/A' }}
                         </div>
                     </div>
                     <div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                         <div class="text-xs text-gray-500">Jobs</div>
                         <div class="font-semibold text-sm flex items-center justify-center gap-1">
                             <span v-if="node.active_backups" class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             {{ node.active_backups || 0 }}
                         </div>
                     </div>
                 </div>
                 <div class="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <UIcon name="i-heroicons-cursor-arrow-rays" class="w-4 h-4" />
                    <span>Click for details & live metrics</span>
                 </div>

        </div>
    </UCard>
</template>
