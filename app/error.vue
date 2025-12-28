<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps({
  error: {
    type: Object as PropType<NuxtError>,
    required: true
  }
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Page not found',
  description: 'The page you are looking for does not exist.'
})

function goHome() {
  clearError({ redirect: '/' })
}

function goBack() {
  clearError()
  if (window.history.length > 1) {
    window.history.back()
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
    <!-- Animated background -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
    </div>

    <div class="relative z-10 text-center">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-12 h-12 text-primary" />
        <span class="text-2xl font-bold text-white">Backup Admin</span>
      </div>

      <!-- Error Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error/10 mb-6">
          <span class="text-4xl font-bold text-error">{{ error.statusCode }}</span>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {{ error.statusCode === 404 ? 'Page Not Found' : 'Something Went Wrong' }}
        </h1>
        
        <p class="text-gray-500 dark:text-gray-400 mb-8">
          {{ error.statusCode === 404 
            ? "The page you're looking for doesn't exist or has been moved."
            : error.message || "An unexpected error occurred. Please try again."
          }}
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UButton 
            size="lg" 
            icon="i-heroicons-home"
            @click="goHome"
          >
            Go to Dashboard
          </UButton>
          <UButton 
            size="lg" 
            color="neutral" 
            variant="outline"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          >
            Go Back
          </UButton>
        </div>
      </div>

      <p class="mt-8 text-sm text-gray-500">
        Need help? Contact your administrator.
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 4s ease-in-out infinite;
}
</style>
