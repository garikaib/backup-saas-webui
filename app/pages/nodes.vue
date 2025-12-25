<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const columns = [
    { key: 'id', label: 'ID' },
    { key: 'hostname', label: 'Hostname' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'storage_quota_gb', label: 'Quota (GB)' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
]

// Fetch nodes
const client = useApiClient()
const { data: nodes, refresh } = await useAsyncData('nodes-list', () => client<any[]>('/nodes/'))
const toast = useToast()

async function approveNode(id: number) {
    try {
        await useApiClient(`/nodes/approve/${id}`, { method: 'POST' })
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
                        v-if="row.original.status === 'active'"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-heroicons-ellipsis-horizontal"
                    />
                </div>
            </template>
        </UTable>
    </UCard>
  </div>
</template>
