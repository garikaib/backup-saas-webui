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

const totalPages = computed(() => Math.ceil(total.value / limit))
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Activity Logs</h1>
        <p class="text-gray-500 text-sm">Track all system activities and user actions</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 items-center">
      <USelectMenu
        v-model="filterAction"
        :items="actions"
        value-key="value"
        class="w-48"
        placeholder="Filter by action"
      />
      <div class="text-sm text-gray-500">
        {{ total }} total logs
      </div>
    </div>

    <!-- Logs Table -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
      </div>
      
      <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-500">
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
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr 
            v-for="log in logs" 
            :key="log.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="getActionIcon(log.action)" 
                  :class="getActionColor(log.action)"
                  class="w-5 h-5"
                />
                <span class="font-medium text-sm">{{ formatAction(log.action) }}</span>
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
              {{ formatDate(log.created_at) }}
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
  </div>
</template>
