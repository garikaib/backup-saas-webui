<script setup lang="ts">
import type { Site } from '~/types/site'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const client = useApiClient()
const authStore = useAuthStore()

// Fetch Nodes (will be empty for Site Admins due to backend filtering)
const { data: nodes } = await useAsyncData('nodes-count', 
  () => client<any[]>('/nodes/').catch(() => []),
  { default: () => [] }
)

// Fetch Sites (for Site Admins)
const { data: sitesData } = await useAsyncData('sites-list',
  () => client<{ sites: Site[], total: number }>('/sites/').catch(() => ({ sites: [], total: 0 })),
  { default: () => ({ sites: [], total: 0 }) }
)

// Fetch Storage Summary (only for Node Admin+)
const { data: storageData } = await useAsyncData('storage-stats',
  () => authStore.isNodeAdminOrHigher 
    ? client<any>('/storage/summary').catch(() => null)
    : Promise.resolve(null),
  { default: () => null }
)

// Admin Stats (Super Admin / Node Admin)
const adminStats = computed(() => {
    const nodeList = Array.isArray(nodes.value) ? nodes.value : []
    const totalNodes = nodeList.length
    const activeNodes = nodeList.filter((n: any) => n.status === 'active').length
    
    const summary = storageData.value
    const allocated = summary?.total_quota_gb || 0
    const used = summary?.total_used_gb || 0
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

// Site Admin Stats
const siteAdminStats = computed(() => {
    const sites = sitesData.value?.sites || []
    const totalSites = sites.length
    const totalBackups = sites.reduce((sum: number, s: Site) => sum + (s.backup_count || 0), 0)
    const totalUsedGb = sites.reduce((sum: number, s: Site) => sum + (s.storage_used_gb || 0), 0)
    const totalQuotaGb = sites.reduce((sum: number, s: Site) => sum + (s.storage_quota_gb || 0), 0)

    return [
        { 
            label: 'Assigned Sites', 
            value: totalSites, 
            icon: 'i-heroicons-globe-alt', 
            color: 'text-blue-500' 
        },
        { 
            label: 'Total Backups', 
            value: totalBackups, 
            icon: 'i-heroicons-archive-box', 
            color: 'text-green-500' 
        },
        { 
            label: 'Storage Used', 
            value: `${totalUsedGb.toFixed(1)} GB`, 
            icon: 'i-heroicons-circle-stack', 
            color: 'text-orange-500' 
        },
        { 
            label: 'Storage Quota', 
            value: `${totalQuotaGb.toFixed(1)} GB`, 
            icon: 'i-heroicons-server-stack', 
            color: 'text-indigo-500' 
        }
    ]
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
    </div>

    <!-- Admin Dashboard (Super Admin / Node Admin) -->
    <template v-if="authStore.isNodeAdminOrHigher">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <UCard v-for="stat in adminStats" :key="stat.label">
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
          <div>
              <StorageHealthWidget />
          </div>
      </div>
    </template>

    <!-- Site Admin Dashboard -->
    <template v-else-if="authStore.isSiteAdmin">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="stat in siteAdminStats" :key="stat.label">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stat.value }}</p>
            </div>
            <UIcon :name="stat.icon" class="w-8 h-8" :class="stat.color || 'text-primary-500'" />
          </div>
        </UCard>
      </div>

      <!-- Assigned Sites List -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Your Assigned Sites</h3>
        </template>
        <div v-if="sitesData?.sites?.length === 0" class="text-center py-8 text-gray-500">
          <UIcon name="i-heroicons-globe-alt" class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No sites assigned to your account yet.</p>
          <p class="text-sm">Contact your administrator to get sites assigned.</p>
        </div>
        <div v-else class="space-y-3">
          <div 
            v-for="site in sitesData?.sites" 
            :key="site.id"
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UIcon name="i-heroicons-globe-alt" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">{{ site.name }}</p>
                <p class="text-sm text-gray-500">{{ site.url || site.wp_path }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  <UIcon name="i-heroicons-server-stack" class="w-3 h-3 inline mr-1" />
                  Server #{{ site.node_id || 'Unknown' }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="flex items-center gap-2 text-sm">
                <UBadge color="success" variant="subtle" size="sm">
                  {{ site.backup_count || 0 }} backups
                </UBadge>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ (site.storage_used_gb || 0).toFixed(1) }} GB used</p>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>

