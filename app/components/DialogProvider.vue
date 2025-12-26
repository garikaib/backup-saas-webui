<script setup lang="ts">
/**
 * Global Dialog Provider
 * 
 * This component should be placed in app.vue or a layout to provide
 * global dialog functionality throughout the application.
 */

const dialog = useDialog()
</script>

<template>
  <AppDialog
    v-model:open="dialog.state.open"
    :title="dialog.state.title"
    :message="dialog.state.message"
    :variant="dialog.state.variant"
    :type="dialog.state.type"
    :confirm-label="dialog.state.confirmLabel"
    :cancel-label="dialog.state.cancelLabel"
    :icon="dialog.state.icon"
    :loading="dialog.state.loading"
    @confirm="dialog.handleConfirm"
    @cancel="dialog.handleCancel"
  />
</template>
