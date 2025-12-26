<script setup lang="ts">
const props = defineProps<{
  used: number
  quota: number
  total: number
  showLabels?: boolean
}>()

const usedPercent = computed(() => Math.min((props.used / props.quota) * 100, 100))
const quotaPercent = computed(() => (props.quota / props.total) * 100)

const barColor = computed(() => {
  if (usedPercent.value >= 90) return 'bg-red-500'
  if (usedPercent.value >= 75) return 'bg-amber-500'
  return 'bg-green-500'
})

function formatSize(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}
</script>

<template>
  <div class="space-y-2">
    <!-- Labels -->
    <div v-if="showLabels" class="flex justify-between text-sm">
      <span class="text-gray-600 dark:text-gray-400">
        {{ formatSize(used) }} used of {{ formatSize(quota) }} quota
      </span>
      <span class="text-gray-500 dark:text-gray-500">
        {{ formatSize(total) }} total
      </span>
    </div>
    
    <!-- Bar container -->
    <div class="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <!-- Quota limit indicator -->
      <div 
        class="absolute top-0 h-full border-r-2 border-gray-400 dark:border-gray-500"
        :style="{ width: `${quotaPercent}%` }"
      />
      
      <!-- Used storage bar -->
      <div 
        class="h-full rounded-full transition-all duration-300"
        :class="barColor"
        :style="{ width: `${(used / total) * 100}%` }"
      />
    </div>
    
    <!-- Legend -->
    <div v-if="showLabels" class="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :class="barColor" />
        <span>Used</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded border-2 border-gray-400 dark:border-gray-500" />
        <span>Quota limit</span>
      </div>
    </div>
  </div>
</template>
