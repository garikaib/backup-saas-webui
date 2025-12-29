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
const allNodes = computed(() => {
    const baseNodes = nodesData.value || []
    
    return baseNodes.map(node => {
        // Only overlay streaming stats for non-pending nodes
        if (node.status === 'pending') return node
        
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

// Separate pending and active nodes
const pendingNodes = computed(() => allNodes.value.filter(n => n.status === 'pending'))
const activeNodes = computed(() => allNodes.value.filter(n => n.status !== 'pending' && n.status !== 'blocked'))
const blockedNodes = computed(() => allNodes.value.filter(n => n.status === 'blocked'))

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
        toast.add({ title: 'Node Approved', description: `Node has been activated and can now sync.`, color: 'success' })
        refresh()
    } catch (error: any) {
        toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to approve node.', color: 'error' })
    }
}

async function blockNode(id: number) {
    try {
        await client(`/nodes/${id}/block`, { method: 'POST' })
        toast.add({ title: 'Node Blocked', description: `Node has been blocked.`, color: 'warning' })
        refresh()
    } catch (error: any) {
        toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to block node.', color: 'error' })
    }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
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

    <!-- Pending Nodes Section -->
    <section v-if="pendingNodes.length > 0" class="space-y-4">
        <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-yellow-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pending Approval</h3>
            <UBadge color="warning" variant="subtle">{{ pendingNodes.length }}</UBadge>
        </div>
        <p class="text-sm text-gray-500">
            These nodes have requested to join your cluster. Verify the registration code matches what's displayed on the server console.
        </p>
        <div class="space-y-3">
            <NodesPendingNodeCard 
                v-for="node in pendingNodes" 
                :key="node.id"
                :node="node"
                @approve="approveNode"
                @block="blockNode"
            />
        </div>
    </section>

    <!-- Active Nodes Section -->
    <section class="space-y-4">
        <div class="flex items-center gap-2" v-if="pendingNodes.length > 0">
            <UIcon name="i-heroicons-server-stack" class="w-5 h-5 text-green-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Active Nodes</h3>
            <UBadge color="success" variant="subtle">{{ activeNodes.length }}</UBadge>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <NodesNodeCard
                v-for="node in activeNodes"
                :key="node.id"
                :node="node"
                @click="openNodeDetail"
                @approve="approveNode"
            />
        </div>
    </section>

    <!-- Blocked Nodes Section (Collapsed) -->
    <section v-if="blockedNodes.length > 0" class="space-y-4">
        <UAccordion :items="[{ label: `Blocked Nodes (${blockedNodes.length})`, slot: 'blocked' }]" variant="soft" color="neutral">
            <template #blocked>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                    <NodesNodeCard
                        v-for="node in blockedNodes"
                        :key="node.id"
                        :node="node"
                        @click="openNodeDetail"
                        @approve="approveNode"
                    />
                </div>
            </template>
        </UAccordion>
    </section>

    <!-- Empty State -->
    <div v-if="status !== 'pending' && !allNodes?.length" class="text-center py-12">
        <UIcon name="i-heroicons-server" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No Nodes Found</h3>
        <p v-if="authStore.isSiteAdmin" class="text-gray-500">You don't have access to any nodes.</p>
        <p v-else class="text-gray-500">Waiting for nodes to connect...</p>
    </div>

    <!-- Loading State -->
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
