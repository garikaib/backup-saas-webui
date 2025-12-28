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
    const [nodesList, storageSummary] = await Promise.all([
        client<NodeResponse[]>('/nodes/'),
        client<any>('/storage/summary').catch(() => null)
    ])

    // Merge stats and storage summary
    return nodesList.map(node => {
        const nodeStorage = storageSummary?.nodes_summary?.find((s: any) => s.node_id === node.id)
        
        // Map stats from new backend API (latest entry)
        const stats = node.stats && node.stats.length > 0 ? node.stats[0] : null
        
        return {
            ...node,
            cpu_usage: stats?.cpu_usage ?? 0,
            disk_usage: stats?.disk_usage ?? 0,
            active_backups: stats?.active_backups ?? 0,
            storage_used_gb: nodeStorage?.used_gb,
            storage_quota_gb: nodeStorage?.quota_gb || node.storage_quota_gb,
        }
    })
})

const nodes = computed(() => nodesData.value || [])

// Polling for live updates (every 30s)
let pollInterval: NodeJS.Timeout | null = null

onMounted(() => {
    pollInterval = setInterval(() => {
        refresh()
    }, 30000)
    // Refresh immediately on mount to be sure
    refresh()
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
})

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
