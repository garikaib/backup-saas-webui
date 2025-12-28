<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #left>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-5 h-5 text-primary" />
        <p class="text-muted text-sm">
          Backup Admin • © {{ currentYear }}
        </p>
      </div>
    </template>

    <template #right>
      <p class="text-muted text-xs">
        Centralized backup management
      </p>
    </template>
  </UFooter>
</template>
