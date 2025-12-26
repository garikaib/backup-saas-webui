<script setup lang="ts">
import type { ActivityLog, ActivityLogListResponse } from '~/types/activity-log'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const authStore = useAuthStore()
const config = useRuntimeConfig()
const toast = useToast()

// Tabs
const activeTab = ref('profile')
const tabs = [
  { value: 'profile', label: 'Profile', icon: 'i-heroicons-user-circle' },
  { value: 'password', label: 'Password', icon: 'i-heroicons-key' },
  { value: 'activity', label: 'Activity', icon: 'i-heroicons-clock' }
]

// Profile form
const profileForm = reactive({
  full_name: '',
  email: ''
})
const profileLoading = ref(false)

// Password form
const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})
const passwordLoading = ref(false)

// Password validation
const passwordMismatch = computed(() => 
  passwordForm.confirmPassword.length > 0 && 
  passwordForm.password !== passwordForm.confirmPassword
)
const passwordTooShort = computed(() => 
  passwordForm.password.length > 0 && 
  passwordForm.password.length < 8
)
const canChangePassword = computed(() => 
  passwordForm.password.length >= 8 && 
  passwordForm.confirmPassword.length > 0 && 
  !passwordMismatch.value
)

// Activity logs
const activityLogs = ref<ActivityLog[]>([])
const activityLoading = ref(false)

// Initialize forms when modal opens
watch(() => props.open, async (isOpen) => {
  if (isOpen && authStore.user) {
    profileForm.full_name = authStore.user.full_name || ''
    profileForm.email = authStore.user.email
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
    activeTab.value = 'profile'
    await loadActivityLogs()
  }
})

async function loadActivityLogs() {
  if (!authStore.token) return
  activityLoading.value = true
  try {
    const response = await $fetch<ActivityLogListResponse>('/activity-logs/me', {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    activityLogs.value = response.logs
  } catch (error) {
    console.error('Failed to load activity logs:', error)
  } finally {
    activityLoading.value = false
  }
}

async function saveProfile() {
  profileLoading.value = true
  try {
    const updated = await authStore.updateProfile({
      full_name: profileForm.full_name || undefined,
      email: profileForm.email
    })
    // Sync form with returned data to ensure UI matches saved state
    if (updated) {
      profileForm.full_name = updated.full_name || ''
      profileForm.email = updated.email
    }
    toast.add({ title: 'Profile Updated', color: 'success' })
  } catch (error: any) {
    toast.add({ 
      title: 'Update Failed', 
      description: error?.data?.detail || 'Could not update profile',
      color: 'error' 
    })
  } finally {
    profileLoading.value = false
  }
}

async function changePassword() {
  if (passwordForm.password !== passwordForm.confirmPassword) {
    toast.add({ title: 'Passwords do not match', color: 'error' })
    return
  }
  if (passwordForm.password.length < 8) {
    toast.add({ title: 'Password must be at least 8 characters', color: 'error' })
    return
  }
  
  passwordLoading.value = true
  try {
    await authStore.updateProfile({ password: passwordForm.password })
    toast.add({ 
      title: 'Password Changed', 
      description: 'You may need to log in again on other devices',
      color: 'success' 
    })
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    toast.add({ 
      title: 'Change Failed', 
      description: error?.data?.detail || 'Could not change password',
      color: 'error' 
    })
  } finally {
    passwordLoading.value = false
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'super_admin': return 'error'
    case 'node_admin': return 'warning'
    default: return 'info'
  }
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <UModal 
    :open="open" 
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <UAvatar 
            :alt="authStore.user?.full_name || authStore.user?.email || 'User'" 
            size="lg"
            class="bg-primary/10"
          />
          <div>
            <h3 class="text-lg font-semibold">{{ authStore.user?.full_name || 'User' }}</h3>
            <UBadge :color="getRoleBadgeColor(authStore.user?.role || '')" size="xs">
              {{ authStore.user?.role?.replace('_', ' ') }}
            </UBadge>
          </div>
        </div>
        <UButton 
          icon="i-heroicons-x-mark" 
          color="neutral" 
          variant="ghost" 
          @click="emit('update:open', false)"
        />
      </div>
    </template>

    <template #body>
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <template #content="{ item }">
          <!-- Profile Tab -->
          <div v-if="item.value === 'profile'" class="space-y-4 pt-4">
            <UFormField label="Full Name">
              <UInput v-model="profileForm.full_name" placeholder="Your full name" />
            </UFormField>
            <UFormField label="Email">
              <UInput v-model="profileForm.email" type="email" placeholder="your@email.com" />
            </UFormField>
            <div class="flex justify-end">
              <UButton 
                label="Save Changes" 
                :loading="profileLoading"
                @click="saveProfile"
              />
            </div>
          </div>

          <!-- Password Tab -->
          <div v-if="item.value === 'password'" class="space-y-4 pt-4">
            <UFormField label="New Password">
              <UInput 
                v-model="passwordForm.password" 
                type="password" 
                placeholder="Enter new password"
              />
            </UFormField>
            <UFormField label="Confirm Password">
              <UInput 
                v-model="passwordForm.confirmPassword" 
                type="password" 
                placeholder="Confirm new password"
                :color="passwordMismatch ? 'error' : undefined"
              />
              <template #hint>
                <span v-if="passwordMismatch" class="text-red-500">Passwords do not match</span>
                <span v-else-if="passwordTooShort" class="text-amber-500">Password must be at least 8 characters</span>
              </template>
            </UFormField>
            <div class="flex justify-end">
              <UButton 
                label="Change Password" 
                color="warning"
                :loading="passwordLoading"
                :disabled="!canChangePassword"
                @click="changePassword"
              />
            </div>
          </div>

          <!-- Activity Tab -->
          <div v-if="item.value === 'activity'" class="pt-4">
            <div v-if="activityLoading" class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <div v-else-if="activityLogs.length === 0" class="text-center py-8 text-gray-500">
              No activity recorded yet
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="log in activityLogs" 
                :key="log.id"
                class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <UIcon 
                  :name="log.action === 'login' ? 'i-heroicons-arrow-right-on-rectangle' : 
                         log.action === 'login_failed' ? 'i-heroicons-x-circle' :
                         log.action.includes('user') ? 'i-heroicons-user' :
                         log.action.includes('node') ? 'i-heroicons-server' :
                         'i-heroicons-clock'"
                  :class="log.action === 'login_failed' ? 'text-red-500' : 'text-gray-400'"
                  class="w-5 h-5 mt-0.5"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm">{{ formatAction(log.action) }}</span>
                    <span v-if="log.target_name" class="text-xs text-gray-500">
                      • {{ log.target_name }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 flex items-center gap-2">
                    <span>{{ formatDate(log.created_at) }}</span>
                    <span>•</span>
                    <span>{{ log.ip_address }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
