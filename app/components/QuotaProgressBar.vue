<script setup lang="ts">
const props = defineProps<{
    usageGb: number
    quotaGb: number
    label?: string
    showValue?: boolean
    compact?: boolean
}>()

const percentage = computed(() => {
    if (!props.quotaGb) return 0
    return Math.min(Math.round((props.usageGb / props.quotaGb) * 100), 100)
})

const color = computed(() => {
    if (percentage.value >= 100) return 'error'
    if (percentage.value >= 80) return 'warning'
    return 'primary'
})

const displayValue = computed(() => {
    return `${props.usageGb} / ${props.quotaGb} GB`
})
</script>

<template>
    <div class="w-full">
        <div v-if="label || showValue" class="flex justify-between items-center mb-1 text-xs">
            <span v-if="label" class="font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
            <span v-if="showValue" class="text-gray-500 font-mono">{{ displayValue }}</span>
        </div>
        
        <UTooltip :text="`${percentage}% Used (${displayValue})`">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" :class="compact ? 'h-1.5' : 'h-2.5'">
                <div 
                    class="h-full transition-all duration-500 ease-out rounded-full"
                    :class="{
                        'bg-red-500': color === 'error',
                        'bg-amber-500': color === 'warning',
                        'bg-primary-500': color === 'primary' 
                    }"
                    :style="{ width: `${percentage}%` }"
                ></div>
            </div>
        </UTooltip>
    </div>
</template>
