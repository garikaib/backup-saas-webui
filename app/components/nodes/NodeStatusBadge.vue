<script setup lang="ts">
defineProps<{
  status: string
}>()

const colorMap = {
  // Streaming statuses
  online: 'success',
  stale: 'warning',
  offline: 'error',
  // REST statuses
  active: 'success',
  pending: 'warning',
  blocked: 'error',
  inactive: 'neutral'
} as const

const labelMap = {
  // Streaming statuses
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline',
  // REST statuses
  active: 'Active',
  pending: 'Pending',
  blocked: 'Blocked',
  inactive: 'Inactive'
}
</script>

<template>
  <UBadge
    :color="colorMap[status as keyof typeof colorMap] || 'neutral'"
    variant="subtle"
  >
    {{ labelMap[status as keyof typeof labelMap] || status }}
  </UBadge>
</template>
