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
const showAddSiteModal = ref(false)
const manualSite = reactive<ManualAddRequest>({
    path: '',
    name: '',
    node_id: undefined
})
const adding = ref(false)

function openManualImport() {
    manualSite.path = ''
    manualSite.name = ''
    manualSite.node_id = props.nodeId
    manualSite.wp_config_path = ''
    showAddSiteModal.value = true
}

async function addManualSite() {
    if (!manualSite.path) return
    adding.value = true
    if (!manualSite.node_id) manualSite.node_id = props.nodeId

    try {
        const response = await client<ImportResponse>('/sites/manual', {
            method: 'POST',
            body: manualSite
        })
        if (response.success) {
            toast.add({ title: 'Success', description: 'Site added', color: 'success' })
            showAddSiteModal.value = false
            refreshSites()
            emit('updated')
        }
    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message || 'Failed to add site', color: 'error' })
    } finally {
        adding.value = false
    }
}

// Backup Logic
async function startBackup(siteId: number) {
    try {
        await client(`/sites/${siteId}/backup/start`, { method: 'POST' })
        toast.add({ title: 'Success', description: 'Backup started.', color: 'success' })
    } catch (error: any) {
        toast.add({ title: 'Error', description: 'Failed to start backup', color: 'error' })
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
              <UBadge :color="row.original.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ row.original.status }}
              </UBadge>
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

        <!-- Inline Action Panels -->
        
        <!-- Scan Results -->
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
                        <div class="text-xs text-gray-500 truncate" :title="site.path">{{ site.path }}</div>
                    </div>
                    <UButton size="xs" label="Import" @click="importSite(site)" :loading="importing === site.path" />
                </div>
            </div>
        </UCard>

        <!-- Manual Add Modal -->
        <!-- Manual Add Modal -->
        <UModal v-model="showAddSiteModal">
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">Add Existing Site</h3>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="showAddSiteModal = false" />
                    </div>
                </template>

                <div class="space-y-4">
                    <p class="text-sm text-gray-500">
                        Manually add a WordPress site by specifying its root path.
                    </p>

                    <form @submit.prevent="addManualSite" class="space-y-4">
                        <UFormField label="Site Name" required help="Friendly name for display">
                             <UInput v-model="manualSite.name" placeholder="My Site" icon="i-heroicons-globe-alt" autofocus />
                        </UFormField>

                        <UFormField label="Root Path" required help="Absolute path to WordPress root directory">
                            <UInput v-model="manualSite.path" placeholder="/var/www/html/example.com" icon="i-heroicons-folder" />
                        </UFormField>
                    </form>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost" @click="showAddSiteModal = false">Cancel</UButton>
                        <UButton 
                            @click="addManualSite" 
                            :loading="adding" 
                            color="primary"
                            icon="i-heroicons-check-circle"
                        >
                            Validate & Add
                        </UButton>
                    </div>
                </template>
            </UCard>
        </UModal>
    </div>
</template>
