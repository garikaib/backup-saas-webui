<script setup lang="ts">
import type { Setting, SettingsListResponse } from '~/types/setting'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({ title: 'Admin Settings' })

const authStore = useAuthStore()
const config = useRuntimeConfig()
const toast = useToast()

// Redirect non-super admins
if (!authStore.isSuperAdmin) {
  navigateTo('/')
}

const loading = ref(true)
const saving = ref(false)

// Turnstile settings
const turnstileSettings = reactive({
  enabled: false,
  site_key: '',
  secret: ''
})

// Track if values have changed
const hasChanges = ref(false)

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  loading.value = true
  try {
    const response = await $fetch<SettingsListResponse>('/settings/', {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    
    // Parse settings
    for (const setting of response.settings) {
      if (setting.key === 'turnstile_enabled') {
        turnstileSettings.enabled = setting.value === 'true'
      } else if (setting.key === 'turnstile_site_key') {
        turnstileSettings.site_key = setting.value || ''
      } else if (setting.key === 'turnstile_secret') {
        turnstileSettings.secret = setting.value || ''
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    toast.add({ title: 'Failed to load settings', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function updateSetting(key: string, value: string) {
  await $fetch(`/settings/${key}`, {
    baseURL: config.public.apiBase,
    method: 'PUT',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: { value }
  })
}

async function saveSettings() {
  saving.value = true
  try {
    await Promise.all([
      updateSetting('turnstile_enabled', turnstileSettings.enabled.toString()),
      updateSetting('turnstile_site_key', turnstileSettings.site_key),
      updateSetting('turnstile_secret', turnstileSettings.secret)
    ])
    toast.add({ title: 'Settings saved', color: 'success' })
    hasChanges.value = false
  } catch (error: any) {
    toast.add({ 
      title: 'Save failed', 
      description: error?.data?.detail || 'Could not save settings',
      color: 'error' 
    })
  } finally {
    saving.value = false
  }
}

function markChanged() {
  hasChanges.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Admin Settings</h1>
        <p class="text-gray-500 text-sm">Manage system-wide configuration</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <template v-else>
      <!-- Turnstile Settings Card -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <UIcon name="i-simple-icons-cloudflare" class="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Cloudflare Turnstile</h2>
            <p class="text-gray-500 text-sm">Protect your login page from bots with Cloudflare's CAPTCHA alternative</p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Enable Toggle -->
          <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
              <p class="font-medium">Enable Turnstile Protection</p>
              <p class="text-sm text-gray-500">Require captcha verification on login</p>
            </div>
            <USwitch 
              v-model="turnstileSettings.enabled" 
              @update:model-value="markChanged"
            />
          </div>

          <!-- Site Key -->
          <UFormField label="Site Key" hint="Public key shown in the browser">
            <UInput 
              v-model="turnstileSettings.site_key" 
              placeholder="0x4AAA..."
              icon="i-heroicons-key"
              @input="markChanged"
            />
          </UFormField>

          <!-- Secret Key -->
          <UFormField label="Secret Key" hint="Private key for server-side verification">
            <UInput 
              v-model="turnstileSettings.secret" 
              type="password"
              placeholder="0x4AAA..."
              icon="i-heroicons-lock-closed"
              @input="markChanged"
            />
          </UFormField>

          <!-- Save Button -->
          <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton 
              label="Save Changes" 
              :loading="saving"
              :disabled="!hasChanges"
              @click="saveSettings"
            />
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div class="flex gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-blue-800 dark:text-blue-300">How to get Turnstile keys</p>
            <p class="text-blue-700 dark:text-blue-400 mt-1">
              1. Go to <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" class="underline">Cloudflare Turnstile Dashboard</a><br>
              2. Add a new site and select your widget type<br>
              3. Copy the Site Key and Secret Key here
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
