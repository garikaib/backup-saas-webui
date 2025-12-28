<script setup lang="ts">
import type { 
    SiteListResponse, 
    ScanResponse, 
    SiteScanResult, 
    ImportResponse,
    ManualAddRequest 
} from '~/types/site'

const props = defineProps<{
    nodeId: number
}>()

const emit = defineEmits<{
    'updated': []
}>()

const client = useApiClient()
const toast = useToast()

// Sites Data
const { data: sitesData, refresh: refreshSites, status: sitesStatus } = await useAsyncData(
    () => props.nodeId ? client<SiteListResponse>(`/nodes/${props.nodeId}/sites`) : Promise.resolve(null),
    { watch: [() => props.nodeId] }
)

// Backup Status
const backupManager = useBackupStatus()
const backupStatuses = backupManager.statuses

// Fetch statuses when sites change
watch(sitesData, async (newData) => {
    if (newData?.sites?.length) {
        const ids = newData.sites.map(s => s.id)
        await backupManager.fetchStatusBatch(ids)
        
        // Start monitoring running backups
        newData.sites.forEach(site => {
            if (backupManager.isRunning(site.id)) {
                backupManager.startMonitoring(site.id)
            }
        })
    }
}, { immediate: true })

// Scanning Logic
const scanning = ref(false)
const isScanModalOpen = ref(false)
const scanResults = ref<SiteScanResult[]>([])
const scannedPath = ref('')
const importing = ref<string | null>(null)

async function triggerNodeScan() {
    scanning.value = true
    try {
        const response = await client<ScanResponse>('/daemon/scan', {
            query: { node_id: props.nodeId }
        })
        if (response.success) {
            // Filter out already imported sites
            const existingSites = sitesData.value?.sites || []
            const existingUuids = new Set(existingSites.map(s => s.uuid).filter(Boolean))
            const existingPaths = new Set(existingSites.map(s => s.wp_path))

            scanResults.value = response.sites.filter(site => {
                if (site.uuid && existingUuids.has(site.uuid)) return false
                if (existingPaths.has(site.path)) return false
                return true
            })
            
            scannedPath.value = response.scanned_path
            isScanModalOpen.value = true
        }
    } catch (error: any) {
        toast.add({ title: 'Scan Failed', description: error.message || 'Failed to scan node', color: 'error' })
    } finally {
        scanning.value = false
    }
}

async function importSite(site: SiteScanResult) {
    importing.value = site.path
    try {
        const response = await client<ImportResponse>('/sites/import', {
            method: 'POST',
            query: {
                name: site.name || 'Unknown',
                wp_path: site.path,
                db_name: site.db_name,
                node_id: props.nodeId
            }
        })
        if (response.success) {
            toast.add({ title: 'Success', description: 'Site imported', color: 'success' })
            scanResults.value = scanResults.value.filter(s => s.path !== site.path)
            refreshSites()
            emit('updated')
            if (scanResults.value.length === 0) isScanModalOpen.value = false
        }
    } catch (error: any) {
        toast.add({ title: 'Import Failed', description: error.message, color: 'error' })
    } finally {
        importing.value = null
    }
}

// Manual Import Logic
import type { VerifySiteResponse, VerifySiteRequest } from '~/types/site'

const showAddSiteModal = ref(false)
const manualSite = reactive<ManualAddRequest>({
    path: '',
    name: '',
    node_id: undefined
})
const validating = ref(false)
const isValidated = ref(false)
const validationMessage = ref('')
const importingManual = ref(false)

function openManualImport() {
    manualSite.path = ''
    manualSite.name = ''
    manualSite.node_id = props.nodeId
    manualSite.wp_config_path = ''
    isValidated.value = false
    validationMessage.value = ''
    showAddSiteModal.value = true
}

async function validateAndAddSite() {
    if (!manualSite.path) return
    
    // Step 1: Validate if not yet validated
    if (!isValidated.value) {
        validating.value = true
        validationMessage.value = ''
        try {
            const verifyPayload: VerifySiteRequest = {
                path: manualSite.path,
                node_id: props.nodeId
            }
            const response = await client<VerifySiteResponse>('/daemon/verify-site', {
                method: 'POST',
                body: verifyPayload
            })

            if (response.success && response.is_valid) {
                isValidated.value = true
                if (response.site_name) manualSite.name = response.site_name
                validationMessage.value = 'Site verified! Click Import to add.'
                toast.add({ title: 'Verified', description: 'Valid WordPress site found', color: 'success' })
            } else {
                isValidated.value = false
                validationMessage.value = response.message || response.error || 'Path is not a valid WordPress site'
                toast.add({ title: 'Invalid Site', description: validationMessage.value, color: 'error' })
            }
        } catch (error: any) {
            isValidated.value = false
            validationMessage.value = error.message || 'Validation failed'
            toast.add({ title: 'Validation Failed', description: validationMessage.value, color: 'error' })
        } finally {
            validating.value = false
        }
        return
    }

    // Step 2: Import
    importingManual.value = true
    if (!manualSite.node_id) manualSite.node_id = props.nodeId

    try {
        const response = await client<ImportResponse>('/sites/manual', {
            method: 'POST',
            body: manualSite
        })
        if (response.success) {
            toast.add({ title: 'Success', description: 'Site added successfully', color: 'success' })
            showAddSiteModal.value = false
            refreshSites()
            emit('updated')
        }
    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message || 'Failed to add site', color: 'error' })
    } finally {
        importingManual.value = false
    }
}

// Backup Logic
async function startBackup(siteId: number) {
    try {
        await client(`/sites/${siteId}/backup/start`, { method: 'POST' })
        toast.add({ title: 'Success', description: 'Backup started.', color: 'success' })
        backupManager.startMonitoring(siteId)
    } catch (error: any) {
        toast.add({ title: 'Error', description: 'Failed to start backup', color: 'error' })
    }
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

function formatSize(gb?: number) {
    if (!gb) return '0 GB'
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
    return `${gb.toFixed(1)} GB`
}

function formatDate(dateStr?: string) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Site Name' },
  { id: 'storage_used_gb', accessorKey: 'storage_used_gb', header: 'Storage' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'last_backup', accessorKey: 'last_backup', header: 'Last Backup' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sites</h3>
            <div class="flex gap-2">
                <UButton icon="i-heroicons-magnifying-glass" size="sm" variant="soft" @click="triggerNodeScan" :loading="scanning">
                    Scan Node
                </UButton>
                <UButton icon="i-heroicons-plus" size="sm" @click="openManualImport">
                    Add Site
                </UButton>
            </div>
        </div>

        <UTable :data="sitesData?.sites || []" :columns="columns" :loading="sitesStatus === 'pending'">
            <template #storage_used_gb-cell="{ row }">
              {{ formatSize(row.original.storage_used_gb) }}
            </template>
            <template #status-cell="{ row }">
               <div class="flex flex-col gap-1">
                  <UBadge 
                    v-if="!backupStatuses[row.original.id] || backupStatuses[row.original.id]?.status === 'idle'"
                    :color="row.original.status === 'active' ? 'success' : 'neutral'" 
                    variant="subtle"
                  >
                    {{ row.original.status }}
                  </UBadge>
                  
                  <template v-else>
                      <UBadge 
                        :color="getBackupStatusColor(backupStatuses[row.original.id]?.status)"
                        variant="subtle"
                      >
                        {{ backupStatuses[row.original.id]?.status?.toUpperCase() }}
                      </UBadge>
                      
                      <div v-if="backupStatuses[row.original.id]?.stage" class="text-xs text-gray-500 truncate max-w-[150px]">
                           {{ backupStatuses[row.original.id]?.stage_detail || backupStatuses[row.original.id]?.stage }}
                      </div>
                      
                      <div v-if="backupStatuses[row.original.id]?.status === 'running'" class="flex flex-col gap-1 w-32">
                           <UProgress 
                             :value="backupStatuses[row.original.id]?.progress || 0" 
                             size="xs" 
                             :color="getBackupStatusColor(backupStatuses[row.original.id]?.status)"
                           />
                           <div class="flex justify-between text-[10px] text-gray-400">
                             <span>{{ backupStatuses[row.original.id]?.progress }}%</span>
                             <span v-if="backupStatuses[row.original.id]?.bytes_processed">
                               {{ formatFileSize(backupStatuses[row.original.id]?.bytes_processed || 0) }}
                             </span>
                           </div>
                      </div>
                  </template>
               </div>
            </template>
            <template #last_backup-cell="{ row }">
              {{ formatDate(row.original.last_backup) }}
            </template>
            <template #actions-cell="{ row }">
              <UButton 
                size="xs" 
                color="primary" 
                variant="soft" 
                label="Backup" 
                icon="i-heroicons-cloud-arrow-up"
                @click="startBackup(row.original.id)"
              />
            </template>
        </UTable>

        <!-- Inline Action Panel (shared position for Scan Results and Add Site) -->
        <UCard v-if="isScanModalOpen" class="mt-4 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-medium">Scan Results</h4>
                    <p class="text-xs text-gray-500">Found {{ scanResults.length }} potential sites in {{ scannedPath }}</p>
                </div>
                <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" @click="isScanModalOpen = false" />
            </div>

            <div v-if="scanResults.length === 0" class="text-center py-6 text-gray-500">
                <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No new WordPress sites detected.</p>
            </div>
            
            <div v-else class="space-y-3 max-h-[40vh] overflow-y-auto">
                <div v-for="site in scanResults" :key="site.path" class="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded flex justify-between items-center">
                    <div class="overflow-hidden mr-4">
                        <div class="font-medium truncate">{{ site.name || 'Unknown' }}</div>
                        <div class="text-xs text-gray-500 truncate">{{ site.path }}</div>
                    </div>
                    <UButton size="xs" label="Import" @click="importSite(site)" :loading="importing === site.path" />
                </div>
            </div>
        </UCard>

        <UCard v-else-if="showAddSiteModal" class="mt-4 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-medium">Add Existing Site</h4>
                    <p class="text-xs text-gray-500">Manually add a WordPress site by specifying its root path.</p>
                </div>
                <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" @click="showAddSiteModal = false" />
            </div>

            <form @submit.prevent="validateAndAddSite" class="space-y-4">
                <UFormField label="Root Path" required help="Absolute path to WordPress root directory (e.g. /var/www/html/mysite)">
                    <UInput 
                        v-model="manualSite.path" 
                        placeholder="/var/www/html/example.com" 
                        icon="i-heroicons-folder" 
                        :disabled="isValidated"
                        @update:model-value="isValidated = false" 
                        autofocus
                    />
                </UFormField>

                <UFormField v-if="isValidated" label="Site Name" required help="Friendly name for display">
                     <UInput v-model="manualSite.name" placeholder="My Site" icon="i-heroicons-globe-alt" />
                </UFormField>

                <div v-if="validationMessage" :class="isValidated ? 'text-green-600' : 'text-red-500'" class="text-sm">
                    <UIcon :name="isValidated ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-circle'" class="w-4 h-4 inline mr-1" />
                    {{ validationMessage }}
                </div>
            </form>

            <div class="flex justify-end gap-2 mt-4">
                <UButton color="neutral" variant="ghost" @click="showAddSiteModal = false">Cancel</UButton>
                <UButton 
                    @click="validateAndAddSite" 
                    :loading="validating || importingManual" 
                    :color="isValidated ? 'primary' : 'neutral'"
                    :variant="isValidated ? 'solid' : 'soft'"
                    :icon="isValidated ? 'i-heroicons-cloud-arrow-down' : 'i-heroicons-check-circle'"
                >
                    {{ validating ? 'Validating...' : importingManual ? 'Importing...' : isValidated ? 'Import Site' : 'Validate Path' }}
                </UButton>
            </div>
        </UCard>
    </div>
</template>
