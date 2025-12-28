<script setup lang="ts">
import WelcomeStep from './WelcomeStep.vue'
import StorageStep from './StorageStep.vue'
import TurnstileStep from './TurnstileStep.vue'
import type { StorageProvidersListResponse } from '~/types/storage'

const isOpen = ref(false)
const currentStep = ref(0)
const loading = ref(true)

const config = useRuntimeConfig()
const authStore = useAuthStore()

// Only check for wizard if we are authenticated
watch(() => authStore.isAuthenticated, async (authenticated) => {
  if (authenticated) {
    await checkConfiguration()
  }
}, { immediate: true })

async function checkConfiguration() {
  // Only super admin should see config wizard
  if (!authStore.isSuperAdmin) return
  
  loading.value = true
  try {
    // Check if any storage provider exists
    const response = await $fetch<StorageProvidersListResponse>('/storage/providers', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${authStore.token}` }
    })
    
    // If no providers, assume unconfigured and show wizard
    if (response.providers.length === 0) {
        isOpen.value = true
    }
  } catch (error) {
    console.error('Failed to check configuration:', error)
  } finally {
    loading.value = false
  }
}

function nextStep() {
  currentStep.value++
}

function closeWizard() {
  isOpen.value = false
}

const steps = [
  { component: WelcomeStep, title: 'Welcome to Backup Admin', icon: 'i-heroicons-sparkles' },
  { component: StorageStep, title: 'Configure Storage', icon: 'i-heroicons-circle-stack' },
  { component: TurnstileStep, title: 'Security Setup', icon: 'i-heroicons-shield-check' }
]

const currentComponent = computed(() => steps[currentStep.value]?.component)
</script>

<template>
  <UModal 
    v-model="isOpen" 
    :prevent-close="currentStep > 0"
    :title="steps[currentStep].title"
    :description="currentStep === 0 ? 'First time setup' : `Step ${currentStep} of ${steps.length - 1}`"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-lg">
           <UIcon :name="currentStep === 0 ? 'i-heroicons-sparkles' : steps[currentStep].icon" class="w-6 h-6 text-primary" />
        </div>
        <div>
           <h3 class="text-lg font-semibold">{{ steps[currentStep].title }}</h3>
           <p v-if="currentStep > 0" class="text-xs text-gray-500">Step {{ currentStep }} of {{ steps.length - 1 }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <UProgress 
            v-if="currentStep > 0" 
            :value="(currentStep / (steps.length - 1)) * 100" 
            size="xs" 
            color="primary" 
        />

        <component 
            :is="currentComponent" 
            @next="nextStep" 
            @skip="nextStep"
            @finish="closeWizard"
        />
      </div>
    </template>
  </UModal>
</template>
