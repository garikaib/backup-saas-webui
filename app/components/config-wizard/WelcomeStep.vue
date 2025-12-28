<script setup lang="ts">
defineEmits(['next'])
</script>

<template>
  <div class="space-y-6">
    <p class="text-gray-600 dark:text-gray-300">
      It looks like this is your first time here. Let's get your system configured and ready to go in just a few steps.
    </p>

    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-100 dark:border-gray-700">
       <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">1</div>
          <span class="text-sm font-medium">Configure Storage Provider</span>
       </div>
       <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">2</div>
          <span class="text-sm font-medium">Setup Login Security</span>
       </div>
    </div>

    <div class="flex justify-end pt-2">
      <UButton 
        label="Start Configuration" 
        icon="i-heroicons-arrow-right" 
        trailing
        @click="$emit('next')"
      />
    </div>
  </div>
</template>
