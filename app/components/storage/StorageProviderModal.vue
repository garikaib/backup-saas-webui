<script setup lang="ts">
import type { StorageProviderCreate } from '~/types/storage'
import { DialogTitle, DialogDescription } from 'reka-ui'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

const config = useRuntimeConfig()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const testing = ref(false)

const provider = reactive<StorageProviderCreate>({
  name: '',
  type: 's3',
  bucket: '',
  region: 'us-east-1',
  endpoint: '',
  access_key: '',
  secret_key: '',
  storage_limit_gb: 0,
  is_default: false
})

const providerTypes = [
  { label: 'AWS S3 / Compatible', value: 's3' },
  { label: 'Backblaze B2', value: 'b2' },
  { label: 'Mega.nz', value: 'mega' },
  { label: 'Local Filesystem', value: 'local' }
]

function resetForm() {
  provider.name = ''
  provider.type = 's3'
  provider.bucket = ''
  provider.region = 'us-east-1'
  provider.endpoint = ''
  provider.access_key = ''
  provider.secret_key = ''
  provider.storage_limit_gb = 0
  provider.is_default = false
}

async function onSubmit() {
  loading.value = true
  try {
    // Ensure numeric conversion
    const payload = { ...provider, storage_limit_gb: Number(provider.storage_limit_gb) }
    
    await $fetch('/storage/providers', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: payload
    })
    toast.add({ title: 'Provider Added', color: 'success' })
    emit('saved')
    emit('update:open', false)
    resetForm()
  } catch (error: any) {
    toast.add({ 
      title: 'Failed to add provider', 
      description: error?.data?.detail || 'Could not save credentials',
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)" title="Add Storage Provider" description="Configure a new storage provider for backups">
    <template #content>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <DialogTitle as="h3" class="text-lg font-semibold">Add Storage Provider</DialogTitle>
          <DialogDescription class="text-sm text-gray-500">Configure a new storage provider for backups.</DialogDescription>
        </div>
        <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" @click="$emit('update:open', false)" />
      </div>

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

        <UFormField label="Total Capacity (GB)" hint="Total space available (0 for unlimited)">
            <UInput v-model.number="provider.storage_limit_gb" type="number" placeholder="1000" />
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
        
        <UCheckbox v-model="provider.is_default" label="Set as Default Provider" />

        <div class="flex justify-end pt-4">
            <UButton 
                type="submit" 
                label="Save Provider" 
                :loading="loading"
            />
        </div>
      </form>
    </div>
    </template>
  </UModal>
</template>
