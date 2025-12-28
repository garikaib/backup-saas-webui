<script setup lang="ts">
import type { StorageSummary } from '~/types/storage'

const props = defineProps<{
  summary: StorageSummary | null
  loading: boolean
}>()

// Calculate total system capacity from all providers
const systemCapacity = computed(() => {
    if (!props.summary?.storage_providers) return 0
    return props.summary.storage_providers.reduce((sum, p) => sum + (p.storage_limit_gb || 0), 0)
})

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 GB'
  return `${bytes.toFixed(1)} GB`
}
</script>

<template>
  <div class="grid gap-6 md:grid-cols-4">
    <!-- System Capacity -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
           <UIcon name="i-heroicons-cloud" class="w-6 h-6" />
        </div>
        <div>
           <p class="text-sm text-gray-500">System Capacity</p>
           <USkeleton v-if="loading" class="h-8 w-24" />
           <p v-else class="text-2xl font-bold">{{ systemCapacity }} GB</p>
        </div>
      </div>
    </UCard>

    <!-- Allocated Quota -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
           <UIcon name="i-heroicons-server-stack" class="w-6 h-6" />
        </div>
        <div>
           <p class="text-sm text-gray-500">Allocated Quota</p>
           <USkeleton v-if="loading" class="h-8 w-24" />
           <p v-else class="text-2xl font-bold">{{ summary?.total_quota_gb }} GB</p>
        </div>
      </div>
    </UCard>

    <!-- Used Storage -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
           <UIcon name="i-heroicons-circle-stack" class="w-6 h-6" />
        </div>
        <div>
           <p class="text-sm text-gray-500">Used Storage</p>
           <USkeleton v-if="loading" class="h-8 w-24" />
           <p v-else class="text-2xl font-bold">{{ summary?.total_used_gb?.toFixed(1) }} GB</p>
        </div>
      </div>
    </UCard>

    <!-- Nodes Count -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
           <UIcon name="i-heroicons-computer-desktop" class="w-6 h-6" />
        </div>
        <div>
           <p class="text-sm text-gray-500">Active Nodes</p>
           <USkeleton v-if="loading" class="h-8 w-24" />
           <p v-else class="text-2xl font-bold">{{ summary?.nodes_count }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
