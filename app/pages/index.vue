<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const client = useApiClient()
const { data: nodes, error: nodesError, pending } = await useAsyncData('nodes-count', 
  () => client<any[]>('/nodes/'),
  { 
    default: () => [],
    // Don't throw on error - handle gracefully
    immediate: true
  }
)

const stats = computed(() => {
    const nodeList = Array.isArray(nodes.value) ? nodes.value : []
    const total = nodeList.length
    const active = nodeList.filter((n: any) => n.status === 'active').length
    const pending = nodeList.filter((n: any) => n.status === 'pending').length
    
    const storage = nodeList.reduce((acc: number, n: any) => acc + (n.storage_quota_gb || 0), 0)

    return [
        { label: 'Total Nodes', value: total, icon: 'i-heroicons-server' },
        { label: 'Active Nodes', value: active, icon: 'i-heroicons-check-circle', color: 'text-success-500' },
        { label: 'Pending Approval', value: pending, icon: 'i-heroicons-clock', color: 'text-warning-500' },
        { label: 'Total Storage', value: `${storage} GB`, icon: 'i-heroicons-circle-stack' }
    ]
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
    </div>

    <!-- Show API error if nodes fetch failed -->
    <UAlert 
      v-if="nodesError" 
      color="error" 
      icon="i-heroicons-exclamation-triangle"
      title="Failed to load data"
      :description="`Could not fetch nodes from API: ${nodesError.message || 'Unknown error'}. Please check your backend connection.`"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stat.value }}</p>
          </div>
          <UIcon :name="stat.icon" class="w-8 h-8" :class="stat.color || 'text-primary-500'" />
        </div>
      </UCard>
    </div>
  </div>
</template>
