<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

definePageMeta({
  layout: 'dashboard'
})

const columns = [
    { id: 'id', accessorKey: 'id', header: 'ID' },
    { id: 'hostname', accessorKey: 'hostname', header: 'Hostname' },
    { id: 'ip_address', accessorKey: 'ip_address', header: 'IP Address' },
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
            
            <template #storage_quota_gb-cell="{ row }">
                <span class="font-mono">{{ row.original.storage_quota_gb }} GB</span>
            </template>
            
            <template #status-cell="{ row }">
                <NodeStatusBadge :status="row.original.status" />
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
