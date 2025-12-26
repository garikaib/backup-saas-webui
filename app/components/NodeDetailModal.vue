<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'
import type { SiteListResponse, SiteResponse } from '~/types/site'
import type { BackupListResponse, BackupResponse } from '~/types/backup'
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
const dialog = useDialog()

// Modal state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Active tab
const activeTab = ref('overview')

// Get current user for role check
const { data: currentUser } = await useAsyncData('current-user-modal', () => 
  client<UserResponse>('/users/me')
)
const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin')

// Fetch node details
const node = ref<NodeDetailResponse | null>(null)
const nodeStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

async function refreshNode() {
  if (!props.nodeId) return
  nodeStatus.value = 'pending'
  try {
    node.value = await client<NodeDetailResponse>(`/nodes/${props.nodeId}`)
    nodeStatus.value = 'success'
  } catch {
    nodeStatus.value = 'error'
  }
}

// Fetch sites for this node
const sitesData = ref<SiteListResponse | null>(null)
const sitesStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

async function refreshSites() {
  if (!props.nodeId) return
  sitesStatus.value = 'pending'
  try {
    sitesData.value = await client<SiteListResponse>(`/nodes/${props.nodeId}/sites`)
    sitesStatus.value = 'success'
  } catch {
    sitesStatus.value = 'error'
  }
}

// Fetch backups for this node
const backupsData = ref<BackupListResponse | null>(null)
const backupsStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

async function refreshBackups() {
  if (!props.nodeId) return
  backupsStatus.value = 'pending'
  try {
    backupsData.value = await client<BackupListResponse>(`/nodes/${props.nodeId}/backups`)
    backupsStatus.value = 'success'
  } catch {
    backupsStatus.value = 'error'
  }
}

// Watch for nodeId changes and refetch
watch(() => props.nodeId, async (newId) => {
  if (newId) {
    await Promise.all([refreshNode(), refreshSites(), refreshBackups()])
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
      description: `Quota cannot exceed total available storage (${node.value.total_available_gb} GB)`, 
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

// Delete backup
async function deleteBackup(backup: BackupResponse) {
  const confirmed = await dialog.confirm({
    title: 'Delete Backup',
    message: `Are you sure you want to delete "${backup.filename}"? This action cannot be undone.`,
    variant: 'danger',
    confirmLabel: 'Delete'
  })
  if (!confirmed) return
  
  try {
    await client(`/nodes/${props.nodeId}/backups/${backup.id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Backup deleted.', color: 'success' })
    refreshBackups()
  } catch (error: any) {
    toast.add({ 
      title: 'Error', 
      description: error?.data?.detail || 'Failed to delete backup', 
      color: 'error' 
    })
  }
}

// Format helpers
function formatSize(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

// Site columns
const siteColumns = [
  { id: 'name', accessorKey: 'name', header: 'Site Name' },
  { id: 'storage_used_gb', accessorKey: 'storage_used_gb', header: 'Storage' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'last_backup', accessorKey: 'last_backup', header: 'Last Backup' }
]

// Backup columns
const backupColumns = [
  { id: 'site_name', accessorKey: 'site_name', header: 'Site' },
  { id: 'filename', accessorKey: 'filename', header: 'Filename' },
  { id: 'size_gb', accessorKey: 'size_gb', header: 'Size' },
  { id: 'backup_type', accessorKey: 'backup_type', header: 'Type' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Created' },
  { id: 'actions', header: 'Actions' }
]

const tabs = [
  { label: 'Overview', value: 'overview', icon: 'i-heroicons-information-circle' },
  { label: 'Sites', value: 'sites', icon: 'i-heroicons-globe-alt' },
  { label: 'Backups', value: 'backups', icon: 'i-heroicons-archive-box' }
]
</script>

<template>
  <UModal v-model:open="isOpen" class="max-w-4xl">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-server" class="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ node?.hostname || 'Loading...' }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ node?.ip_address || '—' }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- Tabs -->
        <UTabs v-model="activeTab" :items="tabs" class="mb-4" />

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Status -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Status:</span>
            <NodeStatusBadge :status="node?.status || 'pending'" />
          </div>

          <!-- Storage Section -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-white">Storage</h4>
              <UButton 
                v-if="isSuperAdmin && !isEditingQuota"
                size="xs" 
                color="neutral" 
                variant="ghost" 
                icon="i-heroicons-pencil"
                @click="startEditQuota"
              />
            </div>

            <!-- Quota Editor -->
            <div v-if="isEditingQuota" class="flex items-center gap-3">
              <UInput 
                v-model.number="newQuota" 
                type="number" 
                :min="0" 
                :max="node?.total_available_gb"
                class="w-32"
              />
              <span class="text-sm text-gray-500">GB</span>
              <UButton size="xs" @click="saveQuota" :loading="savingQuota">Save</UButton>
              <UButton size="xs" color="neutral" variant="ghost" @click="isEditingQuota = false">Cancel</UButton>
            </div>

            <!-- Storage Bar -->
            <StorageUsageBar 
              v-if="node"
              :used="node.storage_used_gb" 
              :quota="node.storage_quota_gb" 
              :total="node.total_available_gb"
              show-labels
            />

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-4 pt-2">
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ node?.sites_count || 0 }}
                </div>
                <div class="text-sm text-gray-500">Sites</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ node?.backups_count || 0 }}
                </div>
                <div class="text-sm text-gray-500">Backups</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ formatSize(node?.storage_used_gb || 0) }}
                </div>
                <div class="text-sm text-gray-500">Used</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sites Tab -->
        <div v-else-if="activeTab === 'sites'">
          <UTable 
            :data="sitesData?.sites || []" 
            :columns="siteColumns" 
            :loading="sitesStatus === 'pending'"
          >
            <template #storage_used_gb-cell="{ row }">
              {{ formatSize(row.original.storage_used_gb) }}
            </template>
            <template #status-cell="{ row }">
              <UBadge :color="row.original.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ row.original.status }}
              </UBadge>
            </template>
            <template #last_backup-cell="{ row }">
              {{ row.original.last_backup ? formatDate(row.original.last_backup) : 'Never' }}
            </template>
          </UTable>
          <div v-if="!sitesData?.sites?.length && sitesStatus !== 'pending'" class="text-center py-8 text-gray-500">
            No sites found for this node.
          </div>
        </div>

        <!-- Backups Tab -->
        <div v-else-if="activeTab === 'backups'">
          <UTable 
            :data="backupsData?.backups || []" 
            :columns="backupColumns" 
            :loading="backupsStatus === 'pending'"
          >
            <template #size_gb-cell="{ row }">
              {{ formatSize(row.original.size_gb) }}
            </template>
            <template #backup_type-cell="{ row }">
              <UBadge :color="row.original.backup_type === 'full' ? 'primary' : 'neutral'" variant="subtle">
                {{ row.original.backup_type }}
              </UBadge>
            </template>
            <template #created_at-cell="{ row }">
              {{ formatDate(row.original.created_at) }}
            </template>
            <template #actions-cell="{ row }">
              <UButton 
                v-if="isSuperAdmin"
                size="xs" 
                color="error" 
                variant="ghost" 
                icon="i-heroicons-trash"
                @click="deleteBackup(row.original)"
              />
            </template>
          </UTable>
          <div v-if="!backupsData?.backups?.length && backupsStatus !== 'pending'" class="text-center py-8 text-gray-500">
            No backups found for this node.
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
