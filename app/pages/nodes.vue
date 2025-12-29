<script setup lang="ts">
import type { NodeStreamStats } from '~/composables/useNodeStats'
import type { NodeResponse } from '~/types/node'

definePageMeta({
  layout: 'dashboard'
})

const client = useApiClient()
const toast = useToast()
const authStore = useAuthStore()

// Use SSE streaming for real-time node stats
const { nodes: streamingNodes, connected, error, reconnect } = useNodeStats(5)

// Fetch initial node list from REST for complete data (hostname, ip, etc)
const { data: nodesData, refresh, status } = await useAsyncData('nodes-list', async () => {
    return client<NodeResponse[]>('/nodes/')
})

// Merge REST data with streaming stats
const nodes = computed(() => {
    const baseNodes = nodesData.value || []
    
    return baseNodes.map(node => {
        // Find matching streaming data
        const streamData = streamingNodes.value.find(s => s.id === node.id)
        
        if (streamData) {
            return {
                ...node,
                // Overlay streaming stats
                status: streamData.status,
                is_master: streamData.is_master,
                cpu_percent: streamData.cpu_percent,
                memory_percent: streamData.memory_percent,
                disk_percent: streamData.disk_percent,
                uptime_seconds: streamData.uptime_seconds,
                active_backups: streamData.active_backups,
                last_seen: streamData.last_seen
            }
        }
        
        return node
    })
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
         <div class="flex items-center gap-2">
             <span v-if="connected" class="flex items-center gap-1 text-xs text-green-600">
                 <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 Live
             </span>
             <span v-else class="flex items-center gap-1 text-xs text-yellow-600">
                 <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                 Reconnecting...
             </span>
             <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" @click="() => { refresh(); reconnect(); }" :loading="status === 'pending'" />
         </div>
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
