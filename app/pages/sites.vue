<script setup lang="ts">
import type { Site, SiteScanResult, ScanResponse, BackupStatus, ImportResponse, ManualAddRequest, Backup, BackupListResponse, DownloadBackupResponse } from '~/types/site'

definePageMeta({
  layout: 'dashboard'
})

const client = useApiClient()
const toast = useToast()
const authStore = useAuthStore()

// State
const sites = ref<Site[]>([])
const loading = ref(false)
const scanning = ref(false)
const isAddModalOpen = ref(false)
const adding = ref(false)
const manualSite = reactive<ManualAddRequest>({
  path: '',
  name: '',
  wp_config_path: '',
  node_id: undefined
})
const scanResults = ref<SiteScanResult[]>([])
const isScanModalOpen = ref(false)
const scannedPath = ref('')
const importing = ref<string | null>(null)
const nodes = ref<{ id: number, hostname: string, ip_address: string }[]>([])

// Backup state
const backupStatuses = ref<Record<number, BackupStatus>>({})
// Polling intervals for active backups
const pollingIntervals: Record<number, any> = {}
const scannedNodeId = ref<number | undefined>(undefined)

// Backup History state
const isBackupHistoryOpen = ref(false)
const selectedSite = ref<Site | null>(null)
const siteBackups = ref<Backup[]>([])
const loadingBackups = ref(false)
const deletingBackup = ref<number | null>(null)

// Helper to check if a scanned site is already imported
function isAlreadyImported(scanResult: SiteScanResult): boolean {
  return sites.value.some(s => s.wp_path === scanResult.path)
}

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

// Node selection computed
const selectedNode = computed({
  get: () => nodes.value.find(n => n.id === manualSite.node_id),
  set: (v: any) => { manualSite.node_id = v?.id }
})

// Fetch nodes for selection
async function fetchNodes() {
  if (!authStore.isSuperAdmin) return
  try {
    const response = await client<{ id: number, hostname: string, ip_address: string }[]>('/nodes/')
    nodes.value = response
  } catch (error) {
    console.error('Failed to fetch nodes', error)
  }
}

// Scan for new sites
async function scanForSites() {
  scanning.value = true
  scanResults.value = []
  try {
    const response = await client<ScanResponse>('/daemon/scan')
    if (response.success) {
      scanResults.value = response.sites
      scannedPath.value = response.scanned_path
      scannedNodeId.value = response.node_id
      isScanModalOpen.value = true
    }
  } catch (error: any) {
    let msg = 'Failed to scan for sites'
    if (error?.data?.detail) {
        if (Array.isArray(error.data.detail)) {
            msg = error.data.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ')
        } else {
            msg = error.data.detail
        }
    }
    toast.add({
      title: 'Scan Failed',
      description: msg,
      color: 'error'
    })
  } finally {
    scanning.value = false
  }
}

// Import a site
async function importSite(site: SiteScanResult) {
  importing.value = site.path
  try {
    // Use the node ID from the scan result, fallback to Master/First Node logic if missing (shouldn't happen with updated backend)
    const masterNode = nodes.value.find(n => n.hostname.toLowerCase().includes('master')) || nodes.value[0]
    const targetNodeId = scannedNodeId.value || masterNode?.id
    
    const response = await client<ImportResponse>('/sites/import', {
      method: 'POST',
      query: {
        name: site.name || 'Unknown Site',
        wp_path: site.path,
        ...(site.db_name ? { db_name: site.db_name } : {}),
        ...(targetNodeId ? { node_id: targetNodeId } : {})
      }
    })
    
    if (response.success) {
      toast.add({
        title: 'Site Imported',
        description: `Successfully imported ${site.name}`,
        color: 'success'
      })
      // Remove from scan results
      scanResults.value = scanResults.value.filter(s => s.path !== site.path)
      // Refresh sites list
      fetchSites()
      
      if (scanResults.value.length === 0) {
        isScanModalOpen.value = false
      }
    }
  } catch (error: any) {
    console.error('Failed to import site', error)
    console.log('Import Error Response Body:', JSON.stringify(error.data, null, 2)) // Debug log
    let description = error.message || 'Failed to import site'
    const detail = error.data?.detail
    
    if (detail) {
      if (Array.isArray(detail)) {
        description = detail.map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`).join('\n')
      } else if (typeof detail === 'string') {
        description = detail
      } else {
        description = JSON.stringify(detail)
      }
    }

    toast.add({
      title: 'Import Failed',
      description,
      color: 'error'
    })
  } finally {
    importing.value = null
  }
}

async function addManualSite() {
  if (!manualSite.path) return
  
  adding.value = true
  try {
    const response = await client<ImportResponse>('/sites/manual', {
      method: 'POST',
      body: manualSite
    })
    
    if (response.success) {
      toast.add({
        title: 'Site Added',
        description: response.message,
        color: 'success'
      })
      isAddModalOpen.value = false
      // Reset form
      manualSite.path = ''
      manualSite.name = ''
      manualSite.wp_config_path = ''
      // Refresh list
      fetchSites()
    }
  } catch (error: any) {
    console.error('Failed to add site', error)
    let description = error.message || 'Unknown error'
    const detail = error.data?.detail
    
    if (detail) {
      if (typeof detail === 'string') {
        description = detail
      } else if (Array.isArray(detail)) {
        description = detail.map((e: any) => e.msg || JSON.stringify(e)).join('\n')
      } else {
        description = JSON.stringify(detail)
      }
    }
    
    toast.add({
      title: 'Failed to add site',
      description,
      color: 'error'
    })
  } finally {
    adding.value = false
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
    // Updated endpoint per new API spec
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
    // Clear local status with all required fields
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
    // Open download URL in new tab
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
    // Remove from local list
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
  if (authStore.isSuperAdmin) {
    fetchNodes()
  }
})

onUnmounted(() => {
  Object.keys(pollingIntervals).forEach(id => stopPolling(Number(id)))
})

// Columns - TanStack Table format with id, accessorKey, header
const columns = [
  { id: 'name', accessorKey: 'name', header: 'Site Name' },
  { id: 'url', accessorKey: 'url', header: 'URL' },
  { id: 'wp_path', accessorKey: 'wp_path', header: 'Path' },
  { id: 'node_id', accessorKey: 'node_id', header: 'Node' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
  <UPage>
    <UPageHeader title="Sites Management" description="Manage WordPress sites and backups" />

    <UPageBody>
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Imported Sites</h2>
            <div class="flex gap-2">
          <UButton
            v-if="authStore.isSuperAdmin"
            icon="i-heroicons-plus"
            variant="soft"
            @click="isAddModalOpen = true"
          >
            Add Site
          </UButton>
          <UButton
            v-if="authStore.isSuperAdmin"
            icon="i-heroicons-arrow-path"
            @click="scanForSites"
            :loading="scanning"
          >
            Scan for Sites
          </UButton>
        </div>
          </div>
        </template>

        <div v-if="!authStore.isSuperAdmin" class="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-900 dark:text-yellow-300">
          <p>Scan button hidden. You are not recognized as Super Admin.</p>
          <p>Current Role: <strong>{{ authStore.user?.role || 'None' }}</strong> (ID: {{ authStore.user?.id }})</p>
        </div>

        <UTable :data="sites" :columns="columns" :loading="loading">
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
                
                <!-- Backup Status Indicator -->
                <div v-if="backupStatuses[row.original.id]?.status === 'running'" class="flex items-center gap-2 text-xs text-primary-500">
                   <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
                   <span>Backing up: {{ backupStatuses[row.original.id]?.progress }}%</span>
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
              
              <UButton 
                size="xs" 
                color="neutral" 
                variant="ghost" 
                icon="i-heroicons-cog-6-tooth" 
              />
            </div>
          </template>

          <template #empty-state>
            <div class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="text-center">
                <p class="text-gray-500 font-medium">No sites found</p>
                <p class="text-sm text-gray-400">Add a site manually or scan for existing installations.</p>
              </div>
              <div class="flex gap-2" v-if="authStore.isSuperAdmin">
                 <UButton icon="i-heroicons-plus" @click="isAddModalOpen = true">Add Site</UButton>
                 <UButton icon="i-heroicons-arrow-path" variant="soft" @click="scanForSites">Scan</UButton>
              </div>
            </div>
          </template>
        </UTable>
      </UCard>
    </UPageBody>

    <!-- Scan Results Modal -->
    <UModal v-model="isScanModalOpen" title="Scan Results" description="Sites detected on the server">
      <UCard>
        <div v-if="scanResults.length === 0" class="text-center py-8 text-gray-500">
          No new sites detected in {{ scannedPath }}
        </div>

        <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto">
          <div v-for="site in scanResults" :key="site.path" class="p-4 border rounded-lg dark:border-gray-700">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium">{{ site.name || 'Unknown Site' }}</h4>
                <p class="text-xs text-gray-500 break-all">{{ site.path }}</p>
                <div class="flex gap-2 mt-2">
                  <UBadge v-if="site.has_wp_config" color="success" variant="subtle" size="xs">Config Found</UBadge>
                  <UBadge v-if="site.db_name" color="info" variant="subtle" size="xs">DB: {{ site.db_name }}</UBadge>
                </div>
              </div>
              <template v-if="isAlreadyImported(site)">
                <UBadge color="neutral" variant="subtle">Already Imported</UBadge>
              </template>
              <template v-else>
                <UButton 
                  size="sm" 
                  label="Import" 
                  :loading="importing === site.path"
                  @click="importSite(site)"
                />
              </template>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
    <!-- Manual Add Modal -->
    <UModal v-model="isAddModalOpen" title="Add Site" description="Manually register a WordPress site">
      <UCard>
        <form @submit.prevent="addManualSite" class="space-y-4">
          <UFormField label="Node (Optional)">
            <USelectMenu
              v-model="selectedNode"
              :items="nodes"
              option-attribute="hostname"
              by="id"
              placeholder="Select Node (Default: Master)"
              searchable
            />
          </UFormField>

          <UFormField label="Web Root Path" required>
            <UInput v-model="manualSite.path" placeholder="/var/www/example.com" />
          </UFormField>
          
          <UFormField label="Site Name (Optional)">
            <UInput v-model="manualSite.name" placeholder="My Blog" />
          </UFormField>

          <UFormField label="WP Config Path (Optional)">
            <UInput v-model="manualSite.wp_config_path" placeholder="/var/www/wp-config.php" />
          </UFormField>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="isAddModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="addManualSite" :loading="adding">Add Site</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

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
