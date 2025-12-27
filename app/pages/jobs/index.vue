<script setup lang="ts">
import type { Job, JobListResponse, JobStatus } from '~/types/job'

definePageMeta({
    layout: 'dashboard'
})

const client = useApiClient()
const toast = useToast()

// State
const jobs = ref<Job[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const limit = ref(20)

// Filters
const statusFilter = ref<JobStatus | undefined>()
const moduleFilter = ref<string | undefined>()

const statusOptions = [
    { label: 'All Statuses', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Running', value: 'running' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' }
]

// Fetch jobs
async function loadJobs() {
    loading.value = true
    try {
        const params: any = {
            limit: limit.value,
            skip: (page.value - 1) * limit.value
        }
        if (statusFilter.value) params.status = statusFilter.value
        if (moduleFilter.value) params.module = moduleFilter.value

        const response = await client<JobListResponse>('/jobs', { query: params })
        jobs.value = response.jobs
        total.value = response.total
    } catch (error) {
        toast.add({ title: 'Error', description: 'Failed to load jobs', color: 'error' })
    } finally {
        loading.value = false
    }
}

// Watchers
watch([page, statusFilter, moduleFilter], loadJobs)

// Auto-refresh running jobs
let pollInterval: NodeJS.Timeout | null = null

onMounted(() => {
    loadJobs()
    pollInterval = setInterval(loadJobs, 5000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
})

// Actions
async function cancelJob(job: Job) {
    if (!confirm('Are you sure you want to cancel this job?')) return

    try {
        await client(`/jobs/${job.id}`, { method: 'DELETE' })
        toast.add({ title: 'Success', description: 'Job cancelled', color: 'success' })
        loadJobs()
    } catch (error: any) {
        toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to cancel job', color: 'error' })
    }
}

// Formatters
function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
}

function getStatusColor(status: string) {
    switch (status) {
        case 'pending': return 'warning'
        case 'running': return 'primary'
        case 'completed': return 'success'
        case 'failed': return 'error'
        default: return 'neutral'
    }
}

const columns = [
    { id: 'module', accessorKey: 'module', header: 'Module' },
    { id: 'target_name', accessorKey: 'target_name', header: 'Target' },
    { id: 'status', accessorKey: 'status', header: 'Status' },
    { id: 'progress', accessorKey: 'progress_percent', header: 'Progress' },
    { id: 'priority', accessorKey: 'priority', header: 'Priority' },
    { id: 'created_at', accessorKey: 'created_at', header: 'Created' },
    { id: 'actions', header: 'Actions' }
]
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Backup Jobs</h1>
                <p class="text-gray-500">Monitor and manage background tasks</p>
            </div>
            <UButton icon="i-heroicons-arrow-path" variant="ghost" @click="loadJobs" :loading="loading" />
        </div>

        <UCard>
            <div class="mb-4 flex gap-4">
                <USelectMenu
                    v-model="statusFilter"
                    :items="statusOptions"
                    value-key="value"
                    placeholder="Status"
                    class="w-40"
                />
            </div>

            <UTable :data="jobs" :columns="columns" :loading="loading">
                <template #module-cell="{ row }">
                     <UBadge color="neutral" variant="subtle">{{ row.original.module }}</UBadge>
                </template>
                
                <template #status-cell="{ row }">
                    <UBadge :color="getStatusColor(row.original.status)" variant="subtle">
                        {{ row.original.status.toUpperCase() }}
                    </UBadge>
                </template>

                <template #progress-cell="{ row }">
                    <div class="flex items-center gap-2 min-w-[100px]">
                        <UProgress :value="row.original.progress_percent" size="sm" :color="getStatusColor(row.original.status)" />
                        <span class="text-xs w-8 text-right">{{ row.original.progress_percent }}%</span>
                    </div>
                </template>

                <template #created_at-cell="{ row }">
                    <span class="text-sm text-gray-500">{{ formatDate(row.original.created_at) }}</span>
                </template>
                
                <template #actions-cell="{ row }">
                    <UButton
                        v-if="['pending', 'running'].includes(row.original.status)"
                        color="error"
                        variant="soft"
                        size="xs"
                        label="Cancel"
                        @click="cancelJob(row.original)"
                    />
                </template>

                <template #empty-state>
                    <div class="text-center py-12 text-gray-500">
                        No jobs found
                    </div>
                </template>
            </UTable>

            <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <UPagination v-model="page" :total="total" :page-count="limit" />
            </div>
        </UCard>
    </div>
</template>
