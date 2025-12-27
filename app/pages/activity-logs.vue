<script setup lang="ts">
import type { ActivityLog, ActivityLogListResponse } from '~/types/activity-log'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({ title: 'Activity Logs' })

const authStore = useAuthStore()
const config = useRuntimeConfig()

const logs = ref<ActivityLog[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const limit = 25

// Filters
const filterUserId = ref<number | undefined>()
const filterAction = ref<string | undefined>()
const searchQuery = ref('')

// Details modal
const showDetails = ref(false)
const selectedLog = ref<ActivityLog | null>(null)

const actions = [
  { label: 'All Actions', value: undefined },
  { label: 'Login', value: 'login' },
  { label: 'Login Failed', value: 'login_failed' },
  { label: 'User Create', value: 'user_create' },
  { label: 'User Update', value: 'user_update' },
  { label: 'User Delete', value: 'user_delete' },
  { label: 'Profile Update', value: 'profile_update' },
  { label: 'Node Approve', value: 'node_approve' },
  { label: 'Node Quota Update', value: 'node_quota_update' },
  { label: 'Backup Delete', value: 'backup_delete' }
]

async function loadLogs() {
  loading.value = true
  try {
    const skip = (page.value - 1) * limit
    let url = `/activity-logs/?skip=${skip}&limit=${limit}`
    if (filterUserId.value) url += `&user_id=${filterUserId.value}`
    if (filterAction.value) url += `&action=${filterAction.value}`
    
    const response = await $fetch<ActivityLogListResponse>(url, {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    logs.value = response.logs
    total.value = response.total
  } catch (error) {
    console.error('Failed to load activity logs:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)

watch([filterAction, page], loadLogs)

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function getActionIcon(action: string) {
  const icons: Record<string, string> = {
    login: 'i-heroicons-arrow-right-on-rectangle',
    login_failed: 'i-heroicons-x-circle',
    user_create: 'i-heroicons-user-plus',
    user_update: 'i-heroicons-pencil',
    user_delete: 'i-heroicons-trash',
    profile_update: 'i-heroicons-user-circle',
    node_approve: 'i-heroicons-check-circle',
    node_quota_update: 'i-heroicons-circle-stack',
    backup_delete: 'i-heroicons-archive-box-x-mark'
  }
  return icons[action] || 'i-heroicons-clock'
}

function getActionColor(action: string) {
  if (action === 'login_failed') return 'text-red-500'
  if (action.includes('delete')) return 'text-orange-500'
  if (action === 'login' || action === 'node_approve') return 'text-green-500'
  return 'text-gray-500'
}

function getActionBadgeColor(action: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (action === 'login_failed') return 'error'
  if (action.includes('delete')) return 'warning'
  if (action === 'login' || action === 'node_approve') return 'success'
  if (action.includes('create')) return 'info'
  return 'neutral'
}

function openDetails(log: ActivityLog) {
  selectedLog.value = log
  showDetails.value = true
}

function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null
  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

// Filter logs by search query (client-side)
const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value
  const query = searchQuery.value.toLowerCase()
  return logs.value.filter(log => 
    log.user_email.toLowerCase().includes(query) ||
    log.action.toLowerCase().includes(query) ||
    log.ip_address.includes(query) ||
    log.target_name?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.ceil(total.value / limit))
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Activity Logs</h1>
        <p class="text-gray-500 text-sm">Track all system activities and user actions</p>
      </div>
      <UButton 
        icon="i-heroicons-arrow-path" 
        variant="soft"
        :loading="loading"
        @click="loadLogs"
      >
        Refresh
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 items-center">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search logs..."
        class="w-64"
      />
      <USelectMenu
        v-model="filterAction"
        :items="actions"
        value-key="value"
        class="w-48"
        placeholder="Filter by action"
      />
      <div class="flex-1"></div>
      <div class="text-sm text-gray-500">
        {{ total }} total logs
      </div>
    </div>

    <!-- Logs Table -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
      </div>
      
      <div v-else-if="filteredLogs.length === 0" class="text-center py-12 text-gray-500">
        No activity logs found
      </div>
      
      <table v-else class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-800 text-left text-sm text-gray-500">
          <tr>
            <th class="px-4 py-3">Action</th>
            <th class="px-4 py-3">User</th>
            <th class="px-4 py-3">Target</th>
            <th class="px-4 py-3">IP Address</th>
            <th class="px-4 py-3">Time</th>
            <th class="px-4 py-3 w-20">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr 
            v-for="log in filteredLogs" 
            :key="log.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            @click="openDetails(log)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="getActionIcon(log.action)" 
                  :class="getActionColor(log.action)"
                  class="w-5 h-5"
                />
                <UBadge :color="getActionBadgeColor(log.action)" size="xs">
                  {{ formatAction(log.action) }}
                </UBadge>
              </div>
            </td>
            <td class="px-4 py-3 text-sm">
              {{ log.user_email }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              <span v-if="log.target_name">{{ log.target_name }}</span>
              <span v-else-if="log.target_type">{{ log.target_type }} #{{ log.target_id }}</span>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 font-mono">
              {{ log.ip_address }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              <span :title="formatDate(log.created_at)">{{ formatRelativeTime(log.created_at) }}</span>
            </td>
            <td class="px-4 py-3">
              <UButton 
                icon="i-heroicons-eye" 
                size="xs" 
                variant="ghost"
                @click.stop="openDetails(log)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <UButton 
        icon="i-heroicons-chevron-left" 
        :disabled="page === 1"
        variant="ghost"
        @click="page--"
      />
      <div class="flex items-center gap-1 text-sm text-gray-500">
        Page {{ page }} of {{ totalPages }}
      </div>
      <UButton 
        icon="i-heroicons-chevron-right" 
        :disabled="page === totalPages"
        variant="ghost"
        @click="page++"
      />
    </div>

    <!-- Details Modal -->
    <UModal v-model:open="showDetails">
      <template #content>
        <div v-if="selectedLog" class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon 
                :name="getActionIcon(selectedLog.action)" 
                :class="getActionColor(selectedLog.action)"
                class="w-6 h-6"
              />
              {{ formatAction(selectedLog.action) }}
            </h2>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              size="sm"
              @click="showDetails = false"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-500">User</div>
              <div class="font-medium">{{ selectedLog.user_email }}</div>
            </div>
            <div>
              <div class="text-gray-500">User ID</div>
              <div class="font-medium">{{ selectedLog.user_id }}</div>
            </div>
            <div>
              <div class="text-gray-500">IP Address</div>
              <div class="font-mono">{{ selectedLog.ip_address }}</div>
            </div>
            <div>
              <div class="text-gray-500">Time</div>
              <div>{{ formatDate(selectedLog.created_at) }}</div>
            </div>
            <div v-if="selectedLog.target_type">
              <div class="text-gray-500">Target Type</div>
              <div class="font-medium">{{ selectedLog.target_type }}</div>
            </div>
            <div v-if="selectedLog.target_id">
              <div class="text-gray-500">Target ID</div>
              <div class="font-medium">{{ selectedLog.target_id }}</div>
            </div>
            <div v-if="selectedLog.target_name" class="col-span-2">
              <div class="text-gray-500">Target Name</div>
              <div class="font-medium">{{ selectedLog.target_name }}</div>
            </div>
          </div>

          <!-- User Agent -->
          <div v-if="selectedLog.user_agent">
            <div class="text-sm text-gray-500 mb-1">User Agent</div>
            <div class="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
              {{ selectedLog.user_agent }}
            </div>
          </div>

          <!-- Details JSON -->
          <div v-if="parseDetails(selectedLog.details)">
            <div class="text-sm text-gray-500 mb-1">Additional Details</div>
            <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-48">{{ JSON.stringify(parseDetails(selectedLog.details), null, 2) }}</pre>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
