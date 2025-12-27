<script setup lang="ts">
import type { BackupListResponse, BackupResponse } from '~/types/backup'

const props = defineProps<{
    nodeId: number
}>()

const client = useApiClient()
const toast = useToast()
const dialog = useDialog()
const authStore = useAuthStore()

const { data: backupsData, refresh: refreshBackups, status: backupsStatus } = await useAsyncData(
    () => props.nodeId ? client<BackupListResponse>(`/nodes/${props.nodeId}/backups`) : Promise.resolve(null),
    { watch: [() => props.nodeId] }
)

async function deleteBackup(backup: BackupResponse) {
    const confirmed = await dialog.confirm({
        title: 'Delete Backup',
        message: `Delete ${backup.filename}?`,
        variant: 'danger'
    })
    if (!confirmed) return

    try {
        await client(`/nodes/${props.nodeId}/backups/${backup.id}`, { method: 'DELETE' })
        toast.add({ title: 'Success', description: 'Backup deleted', color: 'success' })
        refreshBackups()
    } catch (error: any) {
        toast.add({ title: 'Error', description: 'Failed to delete backup', color: 'error' })
    }
}

function formatSize(gb: number) {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
    return `${gb.toFixed(1)} GB`
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString()
}

const columns = [
  { id: 'site_name', accessorKey: 'site_name', header: 'Site' },
  { id: 'filename', accessorKey: 'filename', header: 'Filename' },
  { id: 'size_gb', accessorKey: 'size_gb', header: 'Size' },
  { id: 'backup_type', accessorKey: 'backup_type', header: 'Type' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Created' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-between items-center">
             <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Backups</h3>
             <UButton icon="i-heroicons-arrow-path" size="sm" variant="ghost" @click="refreshBackups" :loading="backupsStatus === 'pending'" />
        </div>

        <UTable :data="backupsData?.backups || []" :columns="columns" :loading="backupsStatus === 'pending'">
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
                v-if="authStore.isSuperAdmin"
                size="xs" 
                color="error" 
                variant="ghost" 
                icon="i-heroicons-trash"
                @click="deleteBackup(row.original)"
              />
            </template>
        </UTable>
    </div>
</template>
