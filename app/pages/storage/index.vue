<script setup lang="ts">
import type { StorageSummary, StorageProvider } from '~/types/storage'
import StorageSummaryCards from '~/components/storage/StorageSummary.vue'
import StorageProviderModal from '~/components/storage/StorageProviderModal.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({ title: 'Storage Management' })

const authStore = useAuthStore()
const config = useRuntimeConfig()
const toast = useToast()

const summary = ref<StorageSummary | null>(null)
const loading = ref(true)
const isModalOpen = ref(false)

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  try {
    summary.value = await $fetch<StorageSummary>('/storage/summary', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (error) {
    console.error('Failed to fetch storage summary:', error)
    toast.add({ title: 'Failed to load storage data', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function deleteProvider(id: number) {
  if (!confirm('Are you sure you want to delete this storage provider? This action cannot be undone.')) return
  
  try {
     await $fetch(`/storage/providers/${id}`, {
        baseURL: config.public.apiBase,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authStore.token}` }
     })
     toast.add({ title: 'Provider deleted', color: 'success' })
     await fetchData() // Refresh
  } catch (error: any) {
     toast.add({ 
       title: 'Delete failed', 
       description: error?.data?.detail || 'Could not delete provider',
       color: 'error' 
     })
  }
}

const columns = [
  { key: 'name', label: 'Name', id: 'name' },
  { key: 'type', label: 'Type', id: 'type' },
  { key: 'bucket', label: 'Bucket', id: 'bucket', class: 'hidden md:table-cell' },
  { key: 'used_gb', label: 'Usage', id: 'used_gb' },
  { key: 'is_default', label: 'Default', id: 'is_default', class: 'hidden sm:table-cell' },
  { key: 'actions', label: 'Actions', id: 'actions' }
]

function getProviderIcon(type: string) {
  switch (type) {
    case 's3': return 'i-simple-icons-amazonaws'
    case 'b2': return 'i-simple-icons-backblaze' 
    case 'mega': return 'i-simple-icons-mega'
    default: return 'i-heroicons-folder'
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Storage Management</h1>
        <p class="text-gray-500">Manage storage quota and providers across all nodes</p>
      </div>
      <UButton 
        v-if="authStore.isSuperAdmin"
        label="Add Provider" 
        icon="i-heroicons-plus" 
        @click="isModalOpen = true" 
      />
    </div>

    <!-- Summary Statistics -->
    <StorageSummaryCards :summary="summary" :loading="loading" />

    <!-- Storage Providers List (Super Admin Only) -->
    <div v-if="authStore.isSuperAdmin" class="space-y-4">
      <h2 class="text-lg font-semibold">Storage Providers</h2>
      
      <UCard :ui="{ body: { padding: '' } }">
        <UTable 
            :rows="summary?.storage_providers || []" 
            :columns="columns"
            :loading="loading"
        >
            <template #name-data="{ row }">
                <div class="flex items-center gap-2">
                    <UIcon :name="getProviderIcon(row.type)" class="w-5 h-5 text-gray-500" />
                    <span class="font-medium">{{ row.name }}</span>
                </div>
            </template>

            <template #type-data="{ row }">
                <UBadge color="gray" variant="soft">{{ row.type.toUpperCase() }}</UBadge>
            </template>

            <template #is_default-data="{ row }">
                 <UIcon v-if="row.is_default" name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
            </template>

            <template #used_gb-data="{ row }">
                {{ row.used_gb.toFixed(2) }} GB
            </template>

            <template #actions-data="{ row }">
                <UButton 
                    color="red" 
                    variant="ghost" 
                    icon="i-heroicons-trash" 
                    size="xs"
                    @click="deleteProvider(Number(row.id))"
                />
            </template>
        </UTable>
      </UCard>
    </div>

    <!-- Per Node Breakdown -->
    <div class="space-y-4">
        <h2 class="text-lg font-semibold">Node Storage Usage</h2>
        <UCard :ui="{ body: { padding: '' } }">
            <UTable 
                :rows="summary?.nodes_summary || []" 
                :columns="[
                    { key: 'hostname', label: 'Node', id: 'hostname' },
                    { key: 'status', label: 'Status', id: 'status' },
                    { key: 'usage_percentage', label: 'Usage', id: 'usage_percentage' },
                    { key: 'used_gb', label: 'Used', id: 'used_gb' },
                    { key: 'quota_gb', label: 'Quota', id: 'quota_gb' }
                ]"
                :loading="loading"
            >
                <template #status-data="{ row }">
                    <UBadge :color="row.status === 'active' ? 'green' : 'orange'" variant="subtle" size="xs">
                        {{ row.status }}
                    </UBadge>
                </template>

                <template #usage_percentage-data="{ row }">
                    <UProgress :value="row.usage_percentage" size="xs" :color="row.usage_percentage > 90 ? 'red' : 'primary'" />
                </template>
                
                <template #used_gb-data="{ row }">
                    {{ row.used_gb.toFixed(1) }} GB
                </template>
            </UTable>
        </UCard>
    </div>

    <StorageProviderModal 
        v-model:open="isModalOpen" 
        @saved="fetchData"
    />
  </div>
</template>
