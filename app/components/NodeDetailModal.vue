<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'
import type { UserResponse } from '~/types/user'

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

// Ensure stream is closed when component unmounts or modal closes
onUnmounted(() => closeStream())
watch(() => props.open, (isOpen) => {
    if (!isOpen) closeStream()
    else if (props.nodeId === 1) setupStream() // Re-setup if opening master
})

async function refreshNode() {
  if (!props.nodeId) return
  nodeStatus.value = 'pending'
  try {
    const nodeData = await client<NodeDetailResponse>(`/nodes/${props.nodeId}`)
    
    // Setup stream if Master
    if (props.nodeId === 1) {
        setupStream()
        // Initial fetch for immediate data before stream kicks in
        try {
            const metrics = await client<any>('/metrics/summary')
            nodeData.cpu_usage = metrics.cpu_percent
        } catch (e) { /* ignore */ }
    } else {
        closeStream()
    }
    
    node.value = nodeData
    nodeStatus.value = 'success'
  } catch {
    nodeStatus.value = 'error'
  }
}

watch(() => props.nodeId, async (newId) => {
  if (newId) {
    refreshNode()
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
                  <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {{ node?.hostname || 'Loading...' }}
                      <NodeStatusBadge v-if="node" :status="node.status" />
                  </h2>
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
                <!-- Quota Widget -->
                <div class="text-right hidden sm:block">
                    <div class="text-xs text-gray-500 mb-1">Storage Quota</div>
                    <div v-if="!isEditingQuota" class="flex items-center justify-end gap-2">
                        <span class="font-mono font-bold text-lg">{{ node?.storage_quota_gb || 0 }} GB</span>
                        <UButton v-if="isSuperAdmin" icon="i-heroicons-pencil" size="xs" color="neutral" variant="ghost" @click="startEditQuota" />
                    </div>
                    <div v-else class="flex items-center gap-2">
                        <UInput v-model="newQuota" type="number" size="xs" class="w-20" />
                        <UButton size="xs" icon="i-heroicons-check" color="success" @click="saveQuota" :loading="savingQuota" />
                        <UButton size="xs" icon="i-heroicons-x-mark" color="neutral" variant="ghost" @click="isEditingQuota = false" />
                    </div>
                </div>

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
