<script setup lang="ts">
import type { PropType } from 'vue'

export interface DialogProps {
  open: boolean
  title?: string
  message?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  type?: 'confirm' | 'alert'
  confirmLabel?: string
  cancelLabel?: string
  icon?: string
  loading?: boolean
}

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  variant: {
    type: String as PropType<'danger' | 'warning' | 'info' | 'success'>,
    default: 'info'
  },
  type: {
    type: String as PropType<'confirm' | 'alert'>,
    default: 'confirm'
  },
  confirmLabel: {
    type: String,
    default: ''
  },
  cancelLabel: {
    type: String,
    default: 'Cancel'
  },
  icon: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

// Computed values for variant-specific styling
const variantConfig = computed(() => {
  const configs = {
    danger: {
      icon: 'i-heroicons-exclamation-triangle',
      iconColor: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      confirmColor: 'error' as const,
      defaultConfirmLabel: 'Delete'
    },
    warning: {
      icon: 'i-heroicons-exclamation-circle',
      iconColor: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      confirmColor: 'warning' as const,
      defaultConfirmLabel: 'Continue'
    },
    info: {
      icon: 'i-heroicons-information-circle',
      iconColor: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      confirmColor: 'primary' as const,
      defaultConfirmLabel: 'Confirm'
    },
    success: {
      icon: 'i-heroicons-check-circle',
      iconColor: 'text-green-500 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      confirmColor: 'success' as const,
      defaultConfirmLabel: 'OK'
    }
  }
  return configs[props.variant]
})

const displayIcon = computed(() => props.icon || variantConfig.value.icon)
const displayConfirmLabel = computed(() => {
  if (props.confirmLabel) return props.confirmLabel
  if (props.type === 'alert') return 'OK'
  return variantConfig.value.defaultConfirmLabel
})

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}

function handleClose() {
  if (!props.loading) {
    handleCancel()
  }
}
</script>

<template>
  <UModal 
    v-model:open="isOpen" 
    :prevent-close="loading"
    @close="handleClose"
    :ui="{ 
      container: 'flex min-h-full items-end sm:items-center justify-center text-center p-4 sm:p-0 z-[100]',
      overlay: { base: 'fixed inset-0 transition-opacity bg-gray-200/75 dark:bg-gray-800/75 z-[99]' }
    }"
  >
    <template #content>
      <div class="p-6">
        <!-- Icon & Header -->
        <div class="flex items-start gap-4">
          <!-- Icon Container -->
          <div 
            class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            :class="variantConfig.bgColor"
          >
            <UIcon 
              :name="displayIcon" 
              class="w-6 h-6" 
              :class="variantConfig.iconColor"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ title }}
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {{ message }}
            </p>
          </div>

          <!-- Close Button -->
          <UButton
            v-if="!loading"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="sm"
            class="flex-shrink-0 -mt-1 -mr-1"
            @click="handleCancel"
          />
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end gap-3">
          <UButton
            v-if="type === 'confirm'"
            color="neutral"
            variant="outline"
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelLabel }}
          </UButton>
          <UButton
            :color="variantConfig.confirmColor"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ displayConfirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* Additional transitions for smooth appearance */
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.2s ease-out;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
