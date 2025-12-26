<script setup lang="ts">
import { useThemeStore } from '~/stores/theme'

definePageMeta({
  layout: 'dashboard'
})

const themeStore = useThemeStore()

// Initialize theme on page load
onMounted(() => {
  themeStore.initTheme()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize your dashboard appearance
        </p>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-swatch" class="w-5 h-5 text-primary-500" />
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Theme</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Choose your preferred color scheme
            </p>
          </div>
        </div>
      </template>

      <ThemeSelector />

      <template #footer>
        <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Current theme: <strong class="text-gray-900 dark:text-white">{{ themeStore.currentTheme.name }}</strong></span>
          <span class="capitalize">{{ themeStore.currentTheme.mode }} mode</span>
        </div>
      </template>
    </UCard>
  </div>
</template>
