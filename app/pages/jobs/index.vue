<script setup lang="ts">
import type { Site } from '~/types/site'
import type { Backup } from '~/types/site'

definePageMeta({
    layout: 'dashboard'
})

useSeoMeta({ title: 'Backup Activity' })

const client = useApiClient()
const toast = useToast()
const authStore = useAuthStore()

// State
const sites = ref<Site[]>([])
const scheduledDeletions = ref<any[]>([])
const loading = ref(true)
const loadingDeletions = ref(true)

// Fetch sites with backup info
async function loadSites() {
    loading.value = true
    try {
        const response = await client<{ sites: Site[], total: number }>('/sites/')
        sites.value = response.sites
    } catch (error) {
        console.error('Failed to load sites', error)
    } finally {
        loading.value = false
    }
}

// Fetch scheduled deletions
async function loadScheduledDeletions() {
    loadingDeletions.value = true
    try {
        const response = await client<{ count: number, backups: any[] }>('/backups/scheduled-deletions')
        scheduledDeletions.value = response.backups || []
    } catch (error) {
        console.error('Failed to load scheduled deletions', error)
        scheduledDeletions.value = []
    } finally {
        loadingDeletions.value = false
    }
}

// Cancel scheduled deletion
async function cancelDeletion(backupId: number) {
    try {
        await client(`/backups/backups/${backupId}/cancel-deletion`, { method: 'DELETE' })
        toast.add({ title: 'Success', description: 'Scheduled deletion cancelled', color: 'success' })
        loadScheduledDeletions()
    } catch (error: any) {
        toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to cancel deletion', color: 'error' })
    }
}

onMounted(() => {
    loadSites()
    loadScheduledDeletions()
})

// Computed stats
const totalBackups = computed(() => 
    sites.value.reduce((sum, site) => sum + (site.backup_count || 0), 0)
)

const totalStorage = computed(() => 
    sites.value.reduce((sum, site) => sum + (site.storage_used_gb || 0), 0).toFixed(2)
)

const scheduledSites = computed(() => 
    sites.value.filter(s => s.schedule_frequency && s.schedule_frequency !== 'manual')
)

const sitesWithRecentBackup = computed(() => 
    sites.value.filter(s => s.last_backup).sort((a, b) => 
        new Date(b.last_backup!).getTime() - new Date(a.last_backup!).getTime()
    ).slice(0, 10)
)

// Formatters
function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
}

function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
}

function formatFrequency(freq: string | undefined) {
    if (!freq || freq === 'manual') return 'Manual'
    return freq.charAt(0).toUpperCase() + freq.slice(1)
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Backup Activity</h1>
                <p class="text-gray-500">Overview of backup operations across all sites</p>
            </div>
            <UButton 
                icon="i-heroicons-arrow-path" 
                variant="ghost" 
                @click="loadSites(); loadScheduledDeletions()" 
                :loading="loading || loadingDeletions" 
            />
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <UCard>
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary/10">
                        <UIcon name="i-heroicons-archive-box" class="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ totalBackups }}</div>
                        <div class="text-sm text-gray-500">Total Backups</div>
                    </div>
                </div>
            </UCard>
            
            <UCard>
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-success/10">
                        <UIcon name="i-heroicons-circle-stack" class="w-6 h-6 text-success" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ totalStorage }} GB</div>
                        <div class="text-sm text-gray-500">Storage Used</div>
                    </div>
                </div>
            </UCard>
            
            <UCard>
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-warning/10">
                        <UIcon name="i-heroicons-clock" class="w-6 h-6 text-warning" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ scheduledSites.length }}</div>
                        <div class="text-sm text-gray-500">Scheduled Sites</div>
                    </div>
                </div>
            </UCard>
            
            <UCard>
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-error/10">
                        <UIcon name="i-heroicons-trash" class="w-6 h-6 text-error" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ scheduledDeletions.length }}</div>
                        <div class="text-sm text-gray-500">Pending Deletions</div>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Scheduled Deletions Warning -->
        <UCard v-if="scheduledDeletions.length > 0">
            <template #header>
                <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
                    <h3 class="font-semibold">Backups Scheduled for Deletion</h3>
                </div>
            </template>
            
            <div class="space-y-3">
                <div 
                    v-for="backup in scheduledDeletions" 
                    :key="backup.backup_id"
                    class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                >
                    <div class="flex items-center gap-3">
                        <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-amber-600" />
                        <div>
                            <div class="font-medium">{{ backup.site_name }}</div>
                            <div class="text-sm text-gray-500">
                                {{ backup.filename }} • {{ backup.size_gb?.toFixed(2) }} GB
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <UBadge color="warning" variant="subtle">
                            {{ backup.days_remaining }} day{{ backup.days_remaining !== 1 ? 's' : '' }} remaining
                        </UBadge>
                        <UButton 
                            size="xs" 
                            color="neutral" 
                            variant="outline"
                            @click="cancelDeletion(backup.backup_id)"
                        >
                            Cancel
                        </UButton>
                    </div>
                </div>
            </div>
        </UCard>

        <!-- Recent Backups -->
        <UCard>
            <template #header>
                <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-500" />
                    <h3 class="font-semibold">Recent Backup Activity</h3>
                </div>
            </template>

            <div v-if="loading" class="flex justify-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>

            <div v-else-if="sitesWithRecentBackup.length === 0" class="text-center py-8 text-gray-500">
                No backup activity yet
            </div>

            <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
                <div 
                    v-for="site in sitesWithRecentBackup" 
                    :key="site.id"
                    class="flex items-center justify-between py-3"
                >
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <div class="font-medium">{{ site.name }}</div>
                            <div class="text-sm text-gray-500">
                                {{ site.backup_count || 0 }} backups • {{ (site.storage_used_gb || 0).toFixed(2) }} GB
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-right">
                            <div class="text-sm">{{ formatRelativeTime(site.last_backup!) }}</div>
                            <div class="text-xs text-gray-500">Last backup</div>
                        </div>
                        <UBadge 
                            :color="site.schedule_frequency === 'manual' ? 'neutral' : 'primary'" 
                            variant="subtle"
                            size="xs"
                        >
                            {{ formatFrequency(site.schedule_frequency) }}
                        </UBadge>
                    </div>
                </div>
            </div>
        </UCard>

        <!-- Scheduled Sites -->
        <UCard>
            <template #header>
                <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-gray-500" />
                    <h3 class="font-semibold">Scheduled Backups</h3>
                </div>
            </template>

            <div v-if="scheduledSites.length === 0" class="text-center py-8 text-gray-500">
                No scheduled backups configured
            </div>

            <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
                <div 
                    v-for="site in scheduledSites" 
                    :key="site.id"
                    class="flex items-center justify-between py-3"
                >
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-primary/10">
                            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div class="font-medium">{{ site.name }}</div>
                            <div class="text-sm text-gray-500">
                                {{ formatFrequency(site.schedule_frequency) }} at {{ site.schedule_time || '00:00' }}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div v-if="site.next_run_at" class="text-right">
                            <div class="text-sm">{{ formatDate(site.next_run_at) }}</div>
                            <div class="text-xs text-gray-500">Next run</div>
                        </div>
                        <UBadge color="success" variant="subtle" size="xs">
                            Active
                        </UBadge>
                    </div>
                </div>
            </div>
        </UCard>
    </div>
</template>
