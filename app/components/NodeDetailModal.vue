<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'
import type { UserResponse } from '~/types/user'
import { DialogTitle, DialogDescription } from 'reka-ui'
import { useSingleNodeStats } from '~/composables/useNodeStats'

const props = defineProps<{
  nodeId: number | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const client = useApiClient()
const toast = useToast()

// Modal state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Get current user for role check
const { data: currentUser } = await useAsyncData('current-user-modal', () => 
  client<UserResponse>('/users/me')
)
const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin')

// Fetch node details (REST for complete data)
const node = ref<NodeDetailResponse | null>(null)
const nodeStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

// Use per-node SSE streaming
const nodeIdRef = computed(() => props.nodeId)
const { node: streamingStats, connected: streamConnected } = useSingleNodeStats(nodeIdRef, 2)

// Merge REST data with streaming stats
const mergedNode = computed(() => {
    if (!node.value) return null
    
    const base = { ...node.value }
    
    if (streamingStats.value) {
        base.cpu_percent = streamingStats.value.cpu_percent
        base.memory_percent = streamingStats.value.memory_percent
        base.disk_percent = streamingStats.value.disk_percent
        base.uptime_seconds = streamingStats.value.uptime_seconds
        base.active_backups = streamingStats.value.active_backups
        base.status = streamingStats.value.status
        base.last_seen = streamingStats.value.last_seen
    }
    
    return base
})

async function refreshNode() {
  if (!props.nodeId) return
  if (nodeStatus.value === 'idle' || nodeStatus.value === 'error') nodeStatus.value = 'pending'
  try {
    const nodeData = await client<NodeDetailResponse>(`/nodes/${props.nodeId}`)
    node.value = nodeData
    nodeStatus.value = 'success'
  } catch {
    nodeStatus.value = 'error'
  }
}

watch(() => props.nodeId, async (newId) => {
  if (newId) {
    await refreshNode()
  }
}, { immediate: true })

// Handle site updates (e.g. import) -> refresh node stats
function handleSitesUpdated() {
  refreshNode()
  emit('updated')
}
</script>

<template>
  <UModal v-model:open="isOpen" class="max-w-5xl" title="Node Dashboard" description="Full view of node performance and sites">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
               <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <UIcon name="i-heroicons-server-stack" class="w-8 h-8 text-primary-600 dark:text-primary-400" />
               </div>
               <div>
                  <DialogTitle as="h2" class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {{ mergedNode?.hostname || 'Loading...' }}
                      <NodesNodeStatusBadge v-if="mergedNode" :status="mergedNode.status" />
                      <UBadge v-if="streamConnected" color="success" variant="subtle" size="xs">Live</UBadge>
                  </DialogTitle>
                  <DialogDescription class="sr-only">Detailed view of node performance, sites, and backups.</DialogDescription>
                  <div class="flex gap-4 text-sm text-gray-500 mt-1">
                      <span class="flex items-center gap-1">
                          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                          {{ mergedNode?.ip_address || 'No IP' }}
                      </span>
                      <span v-if="mergedNode?.last_seen" class="flex items-center gap-1">
                          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                          Seen: {{ new Date(mergedNode.last_seen).toLocaleTimeString() }}
                      </span>
                  </div>
               </div>
            </div>
            
            <div class="flex items-center gap-4">
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isOpen = false" />
            </div>
          </div>
        </template>

        <div v-if="mergedNode" class="space-y-8">
            <!-- Metrics Section -->
            <section>
                <NodesNodeMetrics :node="mergedNode" />
            </section>

            <!-- Sites Section -->
            <section>
                <NodesNodeSites :nodeId="mergedNode.id" @updated="handleSitesUpdated" />
            </section>

            <!-- Backups Section -->
            <section>
                <NodesNodeBackups :nodeId="mergedNode.id" />
            </section>
        </div>
        
        <div v-else-if="nodeStatus === 'error'" class="text-center py-12 text-red-500">
            Failed to load node details.
        </div>
        <div v-else class="text-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-gray-400 mx-auto" />
            <p class="text-gray-500 mt-2">Loading node dashboard...</p>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
