<script setup lang="ts">
import type { Site, BackupStatus, Backup, BackupListResponse, DownloadBackupResponse } from '~/types/site'

definePageMeta({
  layout: 'dashboard'
})

const client = useApiClient()
const toast = useToast()
const authStore = useAuthStore()

// State
const sites = ref<Site[]>([])
const loading = ref(false)
const nodes = ref<{ id: number, hostname: string, ip_address: string }[]>([])

// Backup state
const backupStatuses = ref<Record<number, BackupStatus>>({})
// Polling intervals for active backups
const pollingIntervals: Record<number, any> = {}

// Backup History state
const isBackupHistoryOpen = ref(false)
const selectedSite = ref<Site | null>(null)
const siteBackups = ref<Backup[]>([])
const loadingBackups = ref(false)
const deletingBackup = ref<number | null>(null)

// Computed Grouping
const groupedSites = computed(() => {
    const groups: Record<number, Site[]> = {}
    sites.value.forEach(site => {
        const nid = site.node_id || 0
        if (!groups[nid]) groups[nid] = []
        groups[nid].push(site)
    })
    return groups
})

// Combined Node List (API Nodes + synthesized from sites)
const displayNodes = computed(() => {
    const knownIds = new Set(nodes.value.map(n => n.id))
    const siteNodeIds = new Set(sites.value.map(s => s.node_id || 0))
    
    // Start with API nodes
    const list = [...nodes.value]
    
    // Add missing nodes found in sites
    siteNodeIds.forEach(id => {
        if (!knownIds.has(id)) {
            list.push({ id, hostname: id === 0 ? 'Unassigned' : `Node #${id}`, ip_address: '' })
        }
    })
    
    // Sort by ID
    return list.sort((a, b) => a.id - b.id)
})

// Fetch imported sites
async function fetchSites() {
  loading.value = true
  try {
    const response = await client<{ sites: Site[], total: number }>('/sites/')
    sites.value = response.sites
  } catch (error) {
    console.error('Failed to fetch sites', error)
    sites.value = []
  } finally {
    loading.value = false
  }
}

// Fetch nodes for grouping
async function fetchNodes() {
  // Try to fetch nodes regardless of explicit check, backend will handle 403.
  // We swallow error so page still loads sites.
  try {
    const response = await client<{ id: number, hostname: string, ip_address: string }[]>('/nodes/')
    nodes.value = response
  } catch (error) {
    // console.warn('Failed to fetch nodes for grouping', error) 
  }
}

// Backup Controls
async function startBackup(siteId: number) {
  try {
    await client(`/sites/${siteId}/backup/start`, { method: 'POST' })
    toast.add({ title: 'Backup Started', color: 'success' })
    startPolling(siteId)
  } catch (error: any) {
    let description = error.message || 'Failed to start backup'
    if (error.data?.detail) {
       description = typeof error.data.detail === 'string' 
         ? error.data.detail 
         : JSON.stringify(error.data.detail)
    }
    toast.add({ 
      title: 'Failed to start backup', 
      description,
      color: 'error' 
    })
  }
}

async function stopBackup(siteId: number) {
  try {
    await client(`/sites/${siteId}/backup/stop`, { method: 'POST' })
    toast.add({ title: 'Stopping Backup', color: 'info' })
  } catch (error: any) {
    toast.add({ title: 'Failed to stop backup', color: 'error' })
  }
}

async function checkStatus(siteId: number) {
  try {
    const status = await client<BackupStatus>(`/daemon/backup/status/${siteId}`)
    backupStatuses.value[siteId] = status
    
    if (status.status !== 'running' && status.status !== 'idle') {
      stopPolling(siteId)
    }
  } catch (error) {
    console.error(`Failed to check status for site ${siteId}`, error)
    stopPolling(siteId)
  }
}

async function resetBackup(siteId: number) {
  try {
    await client(`/daemon/backup/reset/${siteId}`, { method: 'POST' })
    toast.add({ title: 'Backup Reset', description: 'Status reset to idle', color: 'success' })
    backupStatuses.value[siteId] = { 
      site_id: siteId, 
      site_name: backupStatuses.value[siteId]?.site_name || 'Unknown',
      status: 'idle', 
      progress: 0, 
      message: '',
      error: null
    }
  } catch (error: any) {
    let description = error.message || 'Failed to reset backup'
    if (error.data?.detail) {
      description = typeof error.data.detail === 'string' 
        ? error.data.detail 
        : JSON.stringify(error.data.detail)
    }
    toast.add({ title: 'Reset Failed', description, color: 'error' })
  }
}

function startPolling(siteId: number) {
  if (pollingIntervals[siteId]) return
  checkStatus(siteId) // Immediate check
  pollingIntervals[siteId] = setInterval(() => checkStatus(siteId), 2000)
}

function stopPolling(siteId: number) {
  if (pollingIntervals[siteId]) {
    clearInterval(pollingIntervals[siteId])
    delete pollingIntervals[siteId]
  }
}

// Backup History Functions
async function viewBackupHistory(site: Site) {
  selectedSite.value = site
  isBackupHistoryOpen.value = true
  loadingBackups.value = true
  siteBackups.value = []
  
  try {
    const response = await client<BackupListResponse>(`/sites/${site.id}/backups`)
    siteBackups.value = response.backups
  } catch (error: any) {
    console.error('Failed to fetch backups', error)
    toast.add({
      title: 'Failed to load backups',
      description: error?.data?.detail || error.message || 'Unknown error',
      color: 'error'
    })
  } finally {
    loadingBackups.value = false
  }
}

async function downloadBackup(backup: Backup) {
  try {
    const response = await client<DownloadBackupResponse>(`/backups/${backup.id}/download`)
    window.open(response.download_url, '_blank')
    toast.add({
      title: 'Download Started',
      description: `Downloading ${backup.filename}`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Failed to get download URL', error)
    toast.add({
      title: 'Download Failed',
      description: error?.data?.detail || error.message || 'Unknown error',
      color: 'error'
    })
  }
}

async function deleteBackup(backup: Backup) {
  if (!confirm(`Are you sure you want to delete backup "${backup.filename}"?`)) return
  
  deletingBackup.value = backup.id
  try {
    await client(`/backups/${backup.id}`, { method: 'DELETE' })
    siteBackups.value = siteBackups.value.filter(b => b.id !== backup.id)
    toast.add({
      title: 'Backup Deleted',
      description: `Successfully deleted ${backup.filename}`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Failed to delete backup', error)
    toast.add({
      title: 'Delete Failed',
      description: error?.data?.detail || error.message || 'Unknown error',
      color: 'error'
    })
  } finally {
    deletingBackup.value = null
  }
}

// Helper formatters
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function getBackupStatusColor(status?: string): 'primary' | 'success' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'running': return 'primary'
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'stopped': return 'warning'
    default: return 'neutral'
  }
}

// Lifecycle
onMounted(() => {
  fetchSites()
  fetchNodes()
})

onUnmounted(() => {
  Object.keys(pollingIntervals).forEach(id => stopPolling(Number(id)))
})

// Columns - Removed node_id
const columns = [
  { id: 'name', accessorKey: 'name', header: 'Site Name' },
  { id: 'url', accessorKey: 'url', header: 'URL' },
  { id: 'wp_path', accessorKey: 'wp_path', header: 'Path' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
  <UPage>
    <UPageHeader title="Sites Management" description="Overview of all managed WordPress sites by Node" />

    <UPageBody>
      <div v-if="loading && nodes.length === 0" class="flex justify-center py-12">
         <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else class="space-y-8">
          <div v-for="node in displayNodes" :key="node.id" class="space-y-3">
              <!-- Node Header -->
              <div class="flex items-center gap-2 px-1">
                  <UIcon name="i-heroicons-server" class="w-5 h-5 text-gray-400" />
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ node.hostname }}</h3>
                  <UBadge v-if="node.ip_address" color="neutral" variant="subtle" size="xs">{{ node.ip_address }}</UBadge>
              </div>

              <!-- Node Sites Table -->
              <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
                  <UTable 
                     :data="groupedSites[node.id] || []" 
                     :columns="columns"
                     :empty-state="{ icon: 'i-heroicons-globe-alt', label: 'No sites found on this node' }"
                  >
                      <template #name-cell="{ row }">
                        <span class="font-medium">{{ row.original.name }}</span>
                      </template>
            
                      <template #status-cell="{ row }">
                         <div class="flex flex-col gap-1">
                            <UBadge 
                              :color="getBackupStatusColor(backupStatuses[row.original.id]?.status)"
                              variant="subtle"
                            >
                              {{ backupStatuses[row.original.id]?.status?.toUpperCase() || 'IDLE' }}
                            </UBadge>
                            <div v-if="backupStatuses[row.original.id]?.status === 'running'" class="flex items-center gap-2 text-xs text-primary-500">
                               <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
                               <span>{{ backupStatuses[row.original.id]?.progress }}%</span>
                            </div>
                         </div>
                      </template>
            
                      <template #actions-cell="{ row }">
                        <div class="flex gap-2">
                          <template v-if="backupStatuses[row.original.id]?.status === 'running'">
                            <UButton 
                              size="xs" 
                              color="error" 
                              variant="soft" 
                              label="Stop" 
                              icon="i-heroicons-stop"
                              @click="stopBackup(row.original.id)"
                            />
                          </template>
                          <template v-else-if="backupStatuses[row.original.id]?.status === 'failed'">
                            <UButton 
                              size="xs" 
                              color="warning" 
                              variant="soft" 
                              label="Reset" 
                              icon="i-heroicons-arrow-path"
                              @click="resetBackup(row.original.id)"
                            />
                          </template>
                          <template v-else>
                            <UButton 
                              size="xs" 
                              color="primary" 
                              variant="soft" 
                              label="Backup" 
                              icon="i-heroicons-cloud-arrow-up"
                              @click="startBackup(row.original.id)"
                            />
                          </template>
                          
                          <UButton 
                            size="xs" 
                            color="info" 
                            variant="soft" 
                            icon="i-heroicons-folder-open"
                            label="Backups"
                            @click="viewBackupHistory(row.original)"
                          />
                        </div>
                      </template>
                  </UTable>
              </UCard>
          </div>
          
          <div v-if="displayNodes.length === 0" class="text-center py-12 text-gray-500">
              <p>No nodes or sites found.</p>
          </div>
      </div>
    </UPageBody>

    <!-- Backup History Modal -->
    <UModal v-model="isBackupHistoryOpen" :title="`Backups - ${selectedSite?.name || 'Site'}`" description="View and manage backup history">
      <UCard>
        <div v-if="loadingBackups" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="siteBackups.length === 0" class="text-center py-12 text-gray-500">
          <UIcon name="i-heroicons-archive-box-x-mark" class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p class="font-medium">No backups found</p>
          <p class="text-sm">Start a backup to create your first restore point.</p>
        </div>

        <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto">
          <div v-for="backup in siteBackups" :key="backup.id" class="p-4 border rounded-lg dark:border-gray-700">
            <div class="flex justify-between items-start gap-4">
              <div class="flex-1 min-w-0">
                <h4 class="font-medium truncate">{{ backup.filename }}</h4>
                <div class="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                    {{ formatDate(backup.created_at) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-server" class="w-3 h-3" />
                    {{ formatFileSize(backup.size_bytes) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-cloud" class="w-3 h-3" />
                    {{ backup.storage_provider }}
                  </span>
                </div>
                <div class="flex gap-2 mt-2">
                  <UBadge :color="backup.status === 'SUCCESS' ? 'success' : backup.status === 'FAILED' ? 'error' : 'warning'" variant="subtle" size="xs">
                    {{ backup.status }}
                  </UBadge>
                  <UBadge color="neutral" variant="subtle" size="xs">{{ backup.backup_type }}</UBadge>
                </div>
              </div>
              <div class="flex gap-2 shrink-0">
                <UButton 
                  size="xs" 
                  color="primary" 
                  variant="soft" 
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadBackup(backup)"
                />
                <UButton 
                  v-if="authStore.isSuperAdmin"
                  size="xs" 
                  color="error" 
                  variant="soft" 
                  icon="i-heroicons-trash"
                  :loading="deletingBackup === backup.id"
                  @click="deleteBackup(backup)"
                />
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">{{ siteBackups.length }} backup(s)</span>
            <UButton color="neutral" variant="ghost" @click="isBackupHistoryOpen = false">Close</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </UPage>
</template>
