<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Signing you in...</h2>
          <p class="text-gray-500 mt-2">Please wait while we verify your link.</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <UIcon name="i-heroicons-x-circle" class="w-8 h-8 text-red-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Invalid Link</h2>
          <p class="text-gray-500 mt-2">{{ errorMessage }}</p>
          <UButton 
            class="mt-6" 
            @click="navigateTo('/login')"
            icon="i-heroicons-arrow-left"
          >
            Back to Login
          </UButton>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Welcome!</h2>
          <p class="text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>

        <!-- No Token State -->
        <div v-else class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-amber-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Missing Token</h2>
          <p class="text-gray-500 mt-2">No login token was provided in the URL.</p>
          <UButton 
            class="mt-6" 
            @click="navigateTo('/login')"
            icon="i-heroicons-arrow-left"
          >
            Back to Login
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Magic Link Login',
  description: 'Sign in via magic link'
})

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const error = ref(false)
const success = ref(false)
const errorMessage = ref('This link is invalid or has expired.')

onMounted(async () => {
  const token = route.query.token as string
  
  if (!token) {
    return
  }
  
  loading.value = true
  
  try {
    await authStore.loginWithMagicLink(token)
    success.value = true
    toast.add({
      title: 'Welcome!',
      description: 'You have been signed in successfully.',
      color: 'success'
    })
    // Redirect after a short delay
    setTimeout(() => {
      navigateTo('/')
    }, 1500)
  } catch (err: any) {
    error.value = true
    errorMessage.value = err?.data?.detail || 'This link is invalid or has expired.'
  } finally {
    loading.value = false
  }
})
</script>
