<template>
  <div class="space-y-2">
    <!-- Password Input with Strength Visibility -->
    <div class="relative">
      <slot></slot>
    </div>

    <!-- Strength Meter -->
    <div v-if="password" class="space-y-2">
      <div class="flex gap-1 h-1.5">
        <div 
          v-for="i in 4" 
          :key="i"
          class="flex-1 rounded-full transition-all duration-300"
          :class="getBarClass(i)"
        ></div>
      </div>
      
      <p class="text-xs text-right transition-colors duration-300" :class="strengthColor">
        {{ strengthLabel }}
      </p>

      <!-- Requirements List (Optional or Validation Errors) -->
      <ul v-if="showRequirements && !isValid" class="text-xs space-y-1 text-gray-500 dark:text-gray-400 mt-2">
        <li :class="{ 'text-green-600 dark:text-green-400': hasMinLength }">
          <UIcon name="i-heroicons-check" class="w-3 h-3 inline mr-1" v-if="hasMinLength" />
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 inline mr-1" v-else />
          At least 12 characters
        </li>
        <li :class="{ 'text-green-600 dark:text-green-400': hasUppercase }">
          <UIcon name="i-heroicons-check" class="w-3 h-3 inline mr-1" v-if="hasUppercase" />
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 inline mr-1" v-else />
          One uppercase letter
        </li>
        <li :class="{ 'text-green-600 dark:text-green-400': hasLowercase }">
          <UIcon name="i-heroicons-check" class="w-3 h-3 inline mr-1" v-if="hasLowercase" />
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 inline mr-1" v-else />
          One lowercase letter
        </li>
        <li :class="{ 'text-green-600 dark:text-green-400': hasNumber }">
          <UIcon name="i-heroicons-check" class="w-3 h-3 inline mr-1" v-if="hasNumber" />
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 inline mr-1" v-else />
          One number
        </li>
        <li :class="{ 'text-green-600 dark:text-green-400': hasSpecial }">
          <UIcon name="i-heroicons-check" class="w-3 h-3 inline mr-1" v-if="hasSpecial" />
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 inline mr-1" v-else />
          One special character
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  password?: string
  showRequirements?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:valid', value: boolean): void
}>()

// Rules
const minLength = 12
const hasMinLength = computed(() => (props.password?.length || 0) >= minLength)
const hasUppercase = computed(() => /[A-Z]/.test(props.password || ''))
const hasLowercase = computed(() => /[a-z]/.test(props.password || ''))
const hasNumber = computed(() => /[0-9]/.test(props.password || ''))
const hasSpecial = computed(() => /[^A-Za-z0-9]/.test(props.password || ''))

const isValid = computed(() => 
  hasMinLength.value && 
  hasUppercase.value && 
  hasLowercase.value && 
  hasNumber.value && 
  hasSpecial.value
)

watch(isValid, (val) => {
  emit('update:valid', val)
}, { immediate: true })

// Score calculation (0-4)
const score = computed(() => {
  if (!props.password) return 0
  let s = 0
  if (props.password.length > 8) s++ // Base length check for some progress
  if (hasMinLength.value) s++
  if (hasUppercase.value && hasLowercase.value) s++
  if (hasNumber.value && hasSpecial.value) s++
  return Math.min(s, 4)
})

const strengthLabel = computed(() => {
  if (!props.password) return ''
  switch (score.value) {
    case 0:
    case 1: return 'Weak'
    case 2: return 'Fair'
    case 3: return 'Good'
    case 4: return 'Strong'
    default: return ''
  }
})

const strengthColor = computed(() => {
  switch (score.value) {
    case 0:
    case 1: return 'text-red-500'
    case 2: return 'text-orange-500'
    case 3: return 'text-yellow-500'
    case 4: return 'text-green-500'
    default: return 'text-gray-500'
  }
})

function getBarClass(index: number) {
  if (index > score.value) return 'bg-gray-200 dark:bg-gray-700'
  switch (score.value) {
    case 1: return 'bg-red-500'
    case 2: return 'bg-orange-500'
    case 3: return 'bg-yellow-500'
    case 4: return 'bg-green-500'
    default: return 'bg-gray-200 dark:bg-gray-700'
  }
}
</script>
