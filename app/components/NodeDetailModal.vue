<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'
import type { UserResponse } from '~/types/user'
import { DialogTitle, DialogDescription } from 'reka-ui'

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

// Fetch node details
const node = ref<NodeDetailResponse | null>(null)
const nodeStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

// SSE Stream state
const eventSource = ref<EventSource | null>(null)
const authStore = useAuthStore()

function closeStream() {
    if (eventSource.value) {
        eventSource.value.close()
        eventSource.value = null
    }
}

function setupStream() {
    closeStream() // Close existing stream if any
    
    // Only stream for Master Node (ID 1)
    if (props.nodeId !== 1) return

    const token = authStore.token
    if (!token) return

    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase
    // Ensure apiBase doesn't have trailing slash for proper concatenation if needed, 
    // but useApiClient usually handles it. Here we need raw URL.
    // Assuming apiBase is full URL like https://api.example.com/api/v1
    // If apiBase is not available, default to specific logic or hardcoded for now based on user context
    // User context: https://wp.zimpricecheck.com:8081/api/v1
    
    const streamUrl = `${apiBase}/metrics/node/stream?token=${token}&interval=2`
    
    // Check if browser supports EventSource
    if (typeof EventSource === 'undefined') return

    try {
        const es = new EventSource(streamUrl)
        
        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (node.value) {
                    if (data.cpu) node.value.cpu_usage = data.cpu.usage_percent
                    if (data.memory) node.value.memory_usage = data.memory.percent_used
                    // Map system disk usage (first disk)
                    if (data.disks && data.disks.length > 0) {
                        const disk = data.disks[0]
                        node.value.disk_usage = disk.percent_used
                        // Convert bytes to GB (1024^3)
                        node.value.disk_total_gb = parseFloat((disk.total_bytes / 1073741824).toFixed(1))
                        node.value.disk_used_gb = parseFloat((disk.used_bytes / 1073741824).toFixed(1))
                        node.value.disk_free_gb = parseFloat(((disk.free_bytes || (disk.total_bytes - disk.used_bytes)) / 1073741824).toFixed(1))
                    }
                    
                    // Advanced Metrics
                    if (data.uptime_seconds) node.value.uptime_seconds = data.uptime_seconds
                    if (data.cpu) {
                        node.value.load_avg = {
                            one: data.cpu.load_avg_1min,
                            five: data.cpu.load_avg_5min,
                            fifteen: data.cpu.load_avg_15min
                        }
                    }
                    if (data.memory) {
                        node.value.swap_percent = data.memory.swap_percent
                        node.value.ram_total_bytes = data.memory.total_bytes
                        node.value.ram_used_bytes = data.memory.used_bytes
                    }
                    if (data.network) {
                        node.value.network = {
                            bytes_sent: data.network.bytes_sent,
                            bytes_recv: data.network.bytes_recv,
                            connections: data.network.connections_count
                        }
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        es.onerror = () => {
            es.close()
        }
        
        eventSource.value = es
    } catch (e) {
        console.error('SSE Connection failed', e)
    }
}

// Polling for remote nodes
let pollInterval: NodeJS.Timeout | null = null

function startPolling() {
    stopPolling()
    // Poll every 30 seconds for non-master nodes
    if (props.nodeId !== 1) {
        pollInterval = setInterval(refreshNode, 30000)
    }
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
    }
}

watch(() => props.open, (isOpen) => {
    if (!isOpen) {
        closeStream()
        stopPolling()
    } else {
        if (props.nodeId === 1) setupStream()
        else startPolling()
    }
})

// Ensure cleanup
onUnmounted(() => {
    closeStream()
    stopPolling()
})

async function refreshNode() {
  if (!props.nodeId) return
  if (nodeStatus.value === 'idle' || nodeStatus.value === 'error') nodeStatus.value = 'pending'
  try {
    const nodeData = await client<NodeDetailResponse>(`/nodes/${props.nodeId}`)
    
    // Map stats from new backend API
    if (nodeData.stats && nodeData.stats.length > 0) {
        const stats = nodeData.stats[0]!
        nodeData.cpu_usage = stats.cpu_usage
        nodeData.disk_usage = stats.disk_usage
        nodeData.active_backups = stats.active_backups
    }

    // Setup stream if Master (only on first load/change)
    if (props.nodeId === 1 && !eventSource.value) {
        setupStream()
    }
    
    node.value = nodeData
    nodeStatus.value = 'success'
  } catch {
    nodeStatus.value = 'error'
  }
}

watch(() => props.nodeId, async (newId) => {
  stopPolling()
  closeStream()
  if (newId) {
    await refreshNode()
    if (props.open && newId !== 1) startPolling()
  }
}, { immediate: true })

// Quota editing
const isEditingQuota = ref(false)
const newQuota = ref(0)
const savingQuota = ref(false)

function startEditQuota() {
  if (node.value) {
    newQuota.value = node.value.storage_quota_gb
    isEditingQuota.value = true
  }
}

async function saveQuota() {
  if (!props.nodeId || !node.value) return
  
  if (newQuota.value > node.value.total_available_gb) {
    toast.add({ 
      title: 'Error', 
      description: `Quota cannot exceed available storage (${node.value.total_available_gb} GB)`, 
      color: 'error' 
    })
    return
  }
  
  savingQuota.value = true
  try {
    await client(`/nodes/${props.nodeId}/quota`, {
      method: 'PUT',
      body: { storage_quota_gb: newQuota.value }
    })
    toast.add({ title: 'Success', description: 'Storage quota updated.', color: 'success' })
    isEditingQuota.value = false
    refreshNode()
    emit('updated')
  } catch (error: any) {
    toast.add({ 
      title: 'Error', 
      description: error?.data?.detail || 'Failed to update quota', 
      color: 'error' 
    })
  } finally {
    savingQuota.value = false
  }
}

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
                      {{ node?.hostname || 'Loading...' }}
                      <NodesNodeStatusBadge v-if="node" :status="node.status" />
                  </DialogTitle>
                  <DialogDescription class="sr-only">Detailed view of node performance, sites, and backups.</DialogDescription>
                  <div class="flex gap-4 text-sm text-gray-500 mt-1">
                      <span class="flex items-center gap-1">
                          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                          {{ node?.ip_address || 'No IP' }}
                      </span>
                      <span v-if="node?.last_seen" class="flex items-center gap-1">
                          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                          Seen: {{ new Date(node.last_seen).toLocaleTimeString() }}
                      </span>
                  </div>
               </div>
            </div>
            
            <div class="flex items-center gap-4">
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isOpen = false" />
            </div>
          </div>
        </template>

        <div v-if="node" class="space-y-8">
            <!-- Metrics Section -->
            <section>
                <NodesNodeMetrics :node="node" />
            </section>

            <!-- Sites Section -->
            <section>
                <NodesNodeSites :nodeId="node.id" @updated="handleSitesUpdated" />
            </section>

            <!-- Backups Section -->
            <section>
                <NodesNodeBackups :nodeId="node.id" />
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
