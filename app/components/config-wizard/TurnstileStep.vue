<script setup lang="ts">
const emit = defineEmits(['finish'])

const config = useRuntimeConfig()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const settings = reactive({
  enabled: false,
  site_key: '',
  secret: ''
})

async function saveSettings() {
  loading.value = true
  try {
    await Promise.all([
      updateSetting('turnstile_enabled', settings.enabled.toString()),
      updateSetting('turnstile_site_key', settings.site_key),
      updateSetting('turnstile_secret', settings.secret)
    ])
    toast.add({ title: 'Security Settings Saved', color: 'success' })
    emit('finish')
  } catch (error: any) {
    toast.add({ 
      title: 'Save failed', 
      description: error?.data?.detail || 'Could not save settings',
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}

async function updateSetting(key: string, value: string) {
  // Only update if value is present or we are disabling
  if (!value && key !== 'turnstile_enabled') return
  
  await $fetch(`/settings/${key}`, {
    baseURL: config.public.apiBase,
    method: 'PUT',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: { value }
  })
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-gray-500 text-sm">
        Enhance security by enabling Cloudflare Turnstile CAPTCHA on the login page.
    </p>

    <div class="space-y-4">
       <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
         <div>
            <p class="font-medium">Enable Turnstile</p>
            <p class="text-xs text-gray-500">Require captcha on login</p>
         </div>
         <USwitch v-model="settings.enabled" />
       </div>

       <div v-if="settings.enabled" class="space-y-4 animate-fade-in">
         <UFormField label="Site Key">
            <UInput v-model="settings.site_key" placeholder="0x4AAA..." />
         </UFormField>
         <UFormField label="Secret Key">
             <UInput v-model="settings.secret" type="password" placeholder="0x4AAA..." />
         </UFormField>
       </div>

       <div class="flex items-center justify-between pt-4">
         <UButton 
            variant="ghost" 
            color="gray" 
            label="Skip" 
            @click="$emit('finish')" 
         />
         <UButton 
            label="Finish Setup" 
            :loading="loading"
            icon="i-heroicons-check" 
            trailing
            @click="saveSettings"
         />
       </div>
    </div>
  </div>
</template>
