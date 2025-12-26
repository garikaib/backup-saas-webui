<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="[$props.class, 'flex items-center gap-2']">
    <UIcon name="i-heroicons-cloud-arrow-up-solid" class="text-primary h-8 w-8" />
    <span class="font-bold text-lg tracking-tight">
      <span class="text-primary">Backup</span>
      <span>Admin</span>
    </span>
  </div>
</template>
