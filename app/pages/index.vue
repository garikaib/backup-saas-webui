<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const client = useApiClient()

// Fetch Nodes
const { data: nodes } = await useAsyncData('nodes-count', 
  () => client<any[]>('/nodes/'),
  { default: () => [] }
)

// Fetch Storage Summary
const { data: storageData } = await useAsyncData('storage-stats',
  () => client<any>('/storage/summary'),
  { default: () => null }
)

const stats = computed(() => {
    // Node Stats
    const nodeList = Array.isArray(nodes.value) ? nodes.value : []
    const totalNodes = nodeList.length
    const activeNodes = nodeList.filter((n: any) => n.status === 'active').length
    
    // Storage Stats
    const summary = storageData.value
    const allocated = summary?.total_quota_gb || 0
    const used = summary?.total_used_gb || 0
    
    // Calculate System Capacity from providers
    const capacity = summary?.storage_providers?.reduce((sum: number, p: any) => sum + (p.storage_limit_gb || 0), 0) || 0

    return [
        { 
            label: 'Nodes', 
            value: totalNodes, 
            subtext: `${activeNodes} Active`,
            icon: 'i-heroicons-computer-desktop', 
            color: 'text-gray-500' 
        },
        { 
            label: 'System Capacity', 
            value: `${capacity.toFixed(0)} GB`, 
            icon: 'i-heroicons-cloud', 
            color: 'text-indigo-500' 
        },
        { 
            label: 'Allocated Quota', 
            value: `${allocated} GB`, 
            icon: 'i-heroicons-server-stack', 
            color: 'text-blue-500' 
        },
        { 
            label: 'Used Storage', 
            value: `${used.toFixed(1)} GB`, 
            icon: 'i-heroicons-circle-stack', 
            color: 'text-orange-500' 
        }
    ]
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
    </div>



    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Stats -->
        <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <UCard v-for="stat in stats" :key="stat.label">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
                    <div class="flex items-baseline gap-2">
                        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stat.value }}</p>
                        <span v-if="stat.subtext" class="text-xs text-gray-500">{{ stat.subtext }}</span>
                    </div>
                  </div>
                  <UIcon :name="stat.icon" class="w-8 h-8" :class="stat.color || 'text-primary-500'" />
                </div>
              </UCard>
        </div>

        <!-- Health Widget -->
        <div>
            <StorageHealthWidget />
        </div>
    </div>
  </div>
</template>
