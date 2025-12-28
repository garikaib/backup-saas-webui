<script setup lang="ts">
import type { StorageProviderCreate } from '~/types/storage'

const emit = defineEmits(['next', 'skip'])

const config = useRuntimeConfig()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const testing = ref(false)

const provider = reactive<StorageProviderCreate>({
  name: 'Primary Storage',
  type: 's3',
  bucket: '',
  region: 'us-east-1',
  endpoint: '',
  access_key: '',
  secret_key: '',
  is_default: true
})

const providerTypes = [
  { label: 'AWS S3 / Compatible', value: 's3' },
  { label: 'Backblaze B2', value: 'b2' },
  { label: 'Mega.nz', value: 'mega' },
  { label: 'Local Filesystem', value: 'local' }
]

async function testConnection() {
  if (!provider.name || !provider.type) return
  
  testing.value = true
  try {
     // We can't actually test without creating it first in this flow usually, 
     // unless backend supports ephemeral update test. 
     // For wizard simplicity, we might skip test or try to create and catch error.
     // But wait! The spec says POST /storage/providers/{id}/test. 
     // We don't have an ID yet.
     // So we'll skip explicit "Test" button for unregistered provider 
     // unless backend has a specific verify endpoint.
     // Instead, we'll try to create it.
  } finally {
    testing.value = false
  }
}

async function onSubmit() {
  loading.value = true
  try {
    await $fetch('/storage/providers', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: provider
    })
    toast.add({ title: 'Storage Configured', color: 'success' })
    emit('next')
  } catch (error: any) {
    toast.add({ 
      title: 'Configuration Failed', 
      description: error?.data?.detail || 'Could not verify storage credentials',
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-gray-500 text-sm">
        Select a storage provider to store your backups. You can add more later.
    </p>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <UFormField label="Provider Type">
        <USelectMenu 
            v-model="provider.type" 
            :options="providerTypes" 
            value-attribute="value"
        />
      </UFormField>

      <UFormField label="Friendly Name">
        <UInput v-model="provider.name" placeholder="e.g. S3 Production" />
      </UFormField>

      <template v-if="['s3', 'b2'].includes(provider.type)">
         <UFormField label="Bucket Name">
            <UInput v-model="provider.bucket" placeholder="my-backup-bucket" />
         </UFormField>

         <UFormField label="Region" v-if="provider.type === 's3'">
            <UInput v-model="provider.region" placeholder="us-east-1" />
         </UFormField>

         <UFormField label="Endpoint URL" hint="Optional for AWS S3">
            <UInput v-model="provider.endpoint" placeholder="https://s3.wasabisys.com" />
         </UFormField>

         <UFormField label="Access Key">
            <UInput v-model="provider.access_key" placeholder="Key ID" />
         </UFormField>

         <UFormField label="Secret Key">
            <UInput v-model="provider.secret_key" type="password" placeholder="Secret Key" />
         </UFormField>
      </template>
      
      <template v-else-if="provider.type === 'mega'">
         <UFormField label="Email">
            <UInput v-model="provider.access_key" placeholder="mega@example.com" />
         </UFormField>
         <UFormField label="Password">
            <UInput v-model="provider.secret_key" type="password" placeholder="Mega Password" />
         </UFormField>
      </template>

      <div class="flex items-center justify-between pt-4">
        <UButton 
            variant="ghost" 
            color="gray" 
            label="Skip for now" 
            @click="$emit('skip')" 
        />
        <UButton 
            type="submit" 
            label="Save & Continue" 
            :loading="loading"
            icon="i-heroicons-arrow-right" 
            trailing
        />
      </div>
    </form>
  </div>
</template>
