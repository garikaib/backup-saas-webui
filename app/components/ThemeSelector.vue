<script setup lang="ts">
import { useThemeStore, type ThemeConfig } from '~/stores/theme'

const themeStore = useThemeStore()

const props = defineProps<{
  compact?: boolean
}>()

function selectTheme(theme: ThemeConfig) {
  themeStore.setTheme(theme.id)
}

function getThemeGradient(theme: ThemeConfig): string {
  const gradients: Record<string, string> = {
    'ocean-light': 'from-sky-400 to-cyan-300',
    'forest-light': 'from-emerald-400 to-green-300',
    'midnight-dark': 'from-violet-600 to-purple-800',
    'charcoal-dark': 'from-blue-600 to-slate-800'
  }
  return gradients[theme.id] || 'from-gray-400 to-gray-600'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Light Themes -->
    <div>
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Light Themes</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="theme in themeStore.lightThemes"
          :key="theme.id"
          class="group relative p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="[
            themeStore.currentTheme.id === theme.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-2 ring-primary-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
          ]"
          @click="selectTheme(theme)"
        >
          <!-- Color Preview -->
          <div
            class="h-16 rounded-lg mb-3 bg-gradient-to-br shadow-inner"
            :class="getThemeGradient(theme)"
          />
          
          <!-- Theme Info -->
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">{{ theme.name }}</h4>
              <p v-if="!compact" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {{ theme.description }}
              </p>
            </div>
            
            <!-- Active Indicator -->
            <div
              v-if="themeStore.currentTheme.id === theme.id"
              class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Dark Themes -->
    <div>
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Dark Themes</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="theme in themeStore.darkThemes"
          :key="theme.id"
          class="group relative p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="[
            themeStore.currentTheme.id === theme.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-2 ring-primary-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
          ]"
          @click="selectTheme(theme)"
        >
          <!-- Color Preview -->
          <div
            class="h-16 rounded-lg mb-3 bg-gradient-to-br shadow-inner"
            :class="getThemeGradient(theme)"
          />
          
          <!-- Theme Info -->
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">{{ theme.name }}</h4>
              <p v-if="!compact" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {{ theme.description }}
              </p>
            </div>
            
            <!-- Active Indicator -->
            <div
              v-if="themeStore.currentTheme.id === theme.id"
              class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
