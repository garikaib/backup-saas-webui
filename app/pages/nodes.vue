<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

definePageMeta({
  layout: 'dashboard'
})

const client = useApiClient()
const toast = useToast()
const authStore = useAuthStore()

// Fetch nodes with storage and metrics data
const { data: nodesData, refresh, status } = await useAsyncData('nodes-combined', async () => {
    const [nodesList, storageSummary, metrics] = await Promise.all([
        client<NodeResponse[]>('/nodes/'),
        client<any>('/storage/summary').catch(() => null),
        client<any>('/metrics/summary').catch(() => null) // Get real-time metrics for master node
    ])

    // Merge storage stats into nodes
    return nodesList.map(node => {
        const nodeStorage = storageSummary?.nodes_summary?.find((s: any) => s.node_id === node.id)
        
        // For Node ID 1 (Master), merge in real-time metrics
        let cpuUsage = undefined
        let diskUsage = nodeStorage?.usage_percentage
        let activeBackups = node.active_backups
        
        if (node.id === 1 && metrics) {
            cpuUsage = metrics.cpu_percent !== undefined ? Math.round(metrics.cpu_percent) : undefined
            diskUsage = metrics.disk_percent !== undefined ? Math.round(metrics.disk_percent * 10) / 10 : diskUsage
        }
        
        return {
            ...node,
            cpu_usage: cpuUsage,
            disk_usage: diskUsage,
            storage_used_gb: nodeStorage?.used_gb,
            storage_quota_gb: nodeStorage?.quota_gb || node.storage_quota_gb,
            active_backups: activeBackups
        }
    })
})

const nodes = computed(() => nodesData.value || [])

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
         <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" @click="() => refresh()" :loading="status === 'pending'" />
    </div>

    <!-- Grid Layout -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <NodesNodeCard
            v-for="node in (Array.isArray(nodes) ? nodes : [])"
            :key="node.id"
            :node="node"
            @click="openNodeDetail"
            @approve="approveNode"
        />
    </div>

    <div v-if="status !== 'pending' && !nodes?.length" class="text-center py-12">
        <UIcon name="i-heroicons-server" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No Nodes Found</h3>
        <p v-if="authStore.isSiteAdmin" class="text-gray-500">You don't have access to any nodes.</p>
        <p v-else class="text-gray-500">Waiting for nodes to connect...</p>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>
    
    <!-- Node Detail Modal -->
    <NodeDetailModal 
        v-model:open="isDetailModalOpen"
        :node-id="selectedNodeId"
        @updated="handleNodeUpdated"
    />
  </div>
</template>
