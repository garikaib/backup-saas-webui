<script setup lang="ts">
import type { JobCreate, JobModulesResponse } from '~/types/job'
import type { NodeResponse } from '~/types/node'
import { DialogTitle, DialogDescription } from 'reka-ui'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open', 'started'])

const config = useRuntimeConfig()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const modules = ref<string[]>([])
const nodes = ref<NodeResponse[]>([])

const job = reactive<JobCreate>({
  module: '',
  target_id: 0,
  priority: 5
})

onMounted(async () => {
    // Load modules and nodes
    try {
        const [modulesRes, nodesRes] = await Promise.all([
            $fetch<JobModulesResponse>('/jobs/modules', {
                baseURL: config.public.apiBase,
                headers: { Authorization: `Bearer ${authStore.token}` }
            }),
            $fetch<NodeResponse[]>('/nodes/', {
                 baseURL: config.public.apiBase,
                 headers: { Authorization: `Bearer ${authStore.token}` }
            })
        ])
        modules.value = modulesRes.modules
        nodes.value = nodesRes
        if (modules.value.length > 0) job.module = modules.value[0]!
        if (nodes.value.length > 0) job.target_id = nodes.value[0]!.id
    } catch (error) {
        console.error('Failed to load job options', error)
    }
})

async function onSubmit() {
  loading.value = true
  try {
    await $fetch('/jobs', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: job
    })
    toast.add({ title: 'Job Started', color: 'success' })
    emit('started')
    emit('update:open', false)
  } catch (error: any) {
    toast.add({ 
      title: 'Failed to start job', 
      description: error?.data?.detail || 'System error',
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)" title="Start New Job" description="Configure and schedule a job on a node">
    <template #content>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <DialogTitle as="h3" class="text-lg font-semibold">Start New Job</DialogTitle>
          <DialogDescription class="text-sm text-gray-500">Configure and schedule a job on a node.</DialogDescription>
        </div>
        <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" @click="$emit('update:open', false)" />
      </div>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormField label="Module">
            <USelectMenu v-model="job.module" :options="modules" />
        </UFormField>

        <!-- Simplified target selection - ideally this depends on module type -->
        <UFormField label="Target Node">
            <USelectMenu 
                v-model="job.target_id" 
                :options="nodes" 
                option-attribute="hostname"
                value-attribute="id"
            />
        </UFormField>

        <UFormField label="Priority">
            <USelectMenu 
               v-model="job.priority" 
               :options="[1, 5, 10]" 
               :labels="{ 1: 'Low', 5: 'Normal', 10: 'High' }"
            />
        </UFormField>

        <div class="flex justify-end pt-4">
            <UButton 
                type="submit" 
                label="Start Job" 
                :loading="loading"
                icon="i-heroicons-play"
            />
        </div>
      </form>
    </div>
    </template>
  </UModal>
</template>
