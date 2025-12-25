<script setup lang="ts">
defineProps<{
  status: string
}>()

const colorMap = {
  active: 'success',
  pending: 'warning',
  blocked: 'error'
} as const

const labelMap = {
  active: 'Active',
  pending: 'Pending',
  blocked: 'Blocked'
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
