<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

definePageMeta({
  layout: 'dashboard'
})

const columns = [
    { id: 'id', accessorKey: 'id', header: 'ID' },
    { id: 'hostname', accessorKey: 'hostname', header: 'Hostname' },
    { id: 'ip_address', accessorKey: 'ip_address', header: 'IP Address' },
    { id: 'stats', header: 'Resources' },
    { id: 'active_backups', accessorKey: 'active_backups', header: 'Backups' },
    { id: 'storage_quota_gb', accessorKey: 'storage_quota_gb', header: 'Quota (GB)' },
    { id: 'status', accessorKey: 'status', header: 'Status' },
    { id: 'actions', header: 'Actions' }
]

// Fetch nodes
const client = useApiClient()
const { data: nodes, refresh } = await useAsyncData('nodes-list', () => client<NodeResponse[]>('/nodes/'))
const toast = useToast()

// Modal state
const selectedNodeId = ref<number | null>(null)
const isDetailModalOpen = ref(false)

function openNodeDetail(node: NodeResponse) {
    selectedNodeId.value = node.id
    isDetailModalOpen.value = true
}

function handleNodeUpdated() {
    refresh()
}

async function approveNode(id: number) {
    try {
        await client(`/nodes/approve/${id}`, { method: 'POST' })
        toast.add({ title: 'Success', description: `Node ${id} approved successfully.`, color: 'success' })
        refresh()
    } catch (error) {
        toast.add({ title: 'Error', description: 'Failed to approve node.', color: 'error' })
    }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
         <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Node Management</h2>
         <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" @click="() => refresh()" />
    </div>

    <UCard>
        <UTable :data="Array.isArray(nodes) ? nodes : []" :columns="columns">
            <template #hostname-cell="{ row }">
                <button
                    class="text-primary-600 dark:text-primary-400 hover:underline font-medium cursor-pointer"
                    @click="openNodeDetail(row.original)"
                >
                    {{ row.original.hostname }}
                </button>
            </template>
            
            <template #stats-cell="{ row }">
                <div class="space-y-1 w-32">
                    <div v-if="row.original.cpu_usage !== undefined" class="flex items-center gap-2 text-xs">
                        <span class="w-8">CPU</span>
                        <UProgress :value="row.original.cpu_usage" color="primary" size="xs" />
                        <span class="w-8 text-right">{{ row.original.cpu_usage }}%</span>
                    </div>
                    <div v-if="row.original.disk_usage !== undefined" class="flex items-center gap-2 text-xs">
                        <span class="w-8">Disk</span>
                        <UProgress :value="row.original.disk_usage" :color="row.original.disk_usage > 90 ? 'error' : 'primary'" size="xs" />
                        <span class="w-8 text-right">{{ row.original.disk_usage }}%</span>
                    </div>
                </div>
            </template>
            
            <template #active_backups-cell="{ row }">
                <div v-if="row.original.active_backups" class="flex items-center gap-1 text-primary-500 font-medium">
                     <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                     {{ row.original.active_backups }} Running
                </div>
                <span v-else class="text-gray-400 text-sm">—</span>
            </template>
            
            <template #storage_quota_gb-cell="{ row }">
                <span class="font-mono">{{ row.original.storage_quota_gb }} GB</span>
            </template>
            
            <template #status-cell="{ row }">
                <NodeStatusBadge :status="row.original.status" />
                <div v-if="row.original.last_seen" class="text-xs text-gray-400 mt-1">
                    {{ new Date(row.original.last_seen).toLocaleTimeString() }}
                </div>
            </template>
            
            <template #actions-cell="{ row }">
                <div class="flex gap-2">
                    <UButton 
                        v-if="row.original.status === 'pending'" 
                        size="xs" 
                        color="primary" 
                        variant="solid" 
                        label="Approve" 
                        @click="approveNode(row.original.id)" 
                    />
                    <UButton 
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-heroicons-eye"
                        @click="openNodeDetail(row.original)"
                    />
                </div>
            </template>
        </UTable>
    </UCard>
    
    <!-- Node Detail Modal -->
    <NodeDetailModal 
        v-model:open="isDetailModalOpen"
        :node-id="selectedNodeId"
        @updated="handleNodeUpdated"
    />
  </div>
</template>
