<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean
    siteId: number
    siteName: string
    currentQuota: number
    currentUsage: number
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'success': []
}>()

const client = useApiClient()
const toast = useToast()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const newQuota = ref(props.currentQuota)
const loading = ref(false)

// Reset when opening
watch(() => props.modelValue, (val) => {
    if (val) {
        newQuota.value = props.currentQuota
    }
})

async function saveQuota() {
    loading.value = true
    try {
        // API expects query param: PUT /sites/{id}/quota?quota_gb=X
        await client(`/sites/${props.siteId}/quota`, {
            method: 'PUT',
            params: {
                quota_gb: newQuota.value
            }
        })

        toast.add({
            title: 'Quota Updated',
            description: `Storage quota for ${props.siteName} updated to ${newQuota.value} GB`,
            color: 'success'
        })
        emit('success')
        isOpen.value = false
    } catch (error: any) {
        console.error('Failed to update quota', error)
        let msg = error?.data?.detail?.message || error?.data?.detail || error.message || 'Unknown error'
        if (typeof msg === 'object') msg = JSON.stringify(msg)
        
        toast.add({
            title: 'Update Failed',
            description: msg,
            color: 'error'
        })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Edit Storage Quota" description="Update storage limit for this site">
        <template #content>
        <UCard>
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                        Edit Storage Quota
                    </h3>
                    <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false" />
                </div>
            </template>

            <div class="space-y-4">
                <p class="text-sm text-gray-500">
                    Update storage limit for <span class="font-medium text-gray-900 dark:text-white">{{ siteName }}</span>.
                </p>

                <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex justify-between items-center text-sm">
                    <span class="text-gray-500">Current Usage</span>
                    <span class="font-semibold" :class="currentUsage > newQuota ? 'text-red-500' : 'text-gray-900 dark:text-white'">
                        {{ currentUsage }} GB
                    </span>
                </div>

                <UFormGroup label="New Quota (GB)" name="quota">
                    <UInput v-model.number="newQuota" type="number" min="1" step="0.1" autofocus />
                </UFormGroup>

                <div v-if="newQuota < currentUsage" class="text-xs text-red-500 flex items-center gap-1">
                    <UIcon name="i-heroicons-exclamation-triangle" />
                    New quota is less than current usage!
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
                    <UButton 
                        color="primary" 
                        :loading="loading" 
                        @click="saveQuota"
                        :disabled="newQuota <= 0"
                    >
                        Save Changes
                    </UButton>
                </div>
            </template>
        </UCard>
        </template>
    </UModal>
</template>
