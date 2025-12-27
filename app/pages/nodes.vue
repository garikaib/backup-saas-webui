<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

definePageMeta({
  layout: 'dashboard'
})

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

    <div v-if="!nodes?.length" class="text-center py-12">
        <UIcon name="i-heroicons-server" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No Nodes Found</h3>
        <p class="text-gray-500">Waiting for nodes to connect...</p>
    </div>
    
    <!-- Node Detail Modal -->
    <NodeDetailModal 
        v-model:open="isDetailModalOpen"
        :node-id="selectedNodeId"
        @updated="handleNodeUpdated"
    />
  </div>
</template>
