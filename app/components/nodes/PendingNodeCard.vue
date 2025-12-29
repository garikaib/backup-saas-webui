<script setup lang="ts">
import type { NodeResponse } from '~/types/node'

const props = defineProps<{
    node: NodeResponse
}>()

const emit = defineEmits<{
    'approve': [id: number]
    'block': [id: number]
}>()

const approvingNode = ref(false)
const blockingNode = ref(false)
</script>

<template>
    <div class="p-5 border-2 border-dashed border-yellow-400 dark:border-yellow-600 rounded-xl bg-yellow-50/50 dark:bg-yellow-950/20">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Node Info -->
            <div class="flex items-start gap-3">
                <div class="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <UIcon name="i-heroicons-server-stack" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-900 dark:text-white">{{ node.hostname }}</span>
                        <UBadge color="warning" variant="subtle" size="xs">Pending</UBadge>
                    </div>
                    <div class="text-sm text-gray-500 font-mono mt-1">{{ node.ip_address || 'IP not provided' }}</div>
                </div>
            </div>

            <!-- Registration Code & Actions -->
            <div class="flex items-center gap-4">
                <!-- Registration Code -->
                <div v-if="node.registration_code" class="text-center">
                    <div class="text-xs text-gray-500 mb-1">Registration Code</div>
                    <code class="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xl font-mono font-bold tracking-wider text-gray-900 dark:text-white">
                        {{ node.registration_code }}
                    </code>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                    <UButton 
                        color="success" 
                        icon="i-heroicons-check-circle"
                        :loading="approvingNode"
                        @click="emit('approve', node.id)"
                    >
                        Approve
                    </UButton>
                    <UButton 
                        color="error" 
                        variant="outline"
                        icon="i-heroicons-x-circle"
                        :loading="blockingNode"
                        @click="emit('block', node.id)"
                    >
                        Block
                    </UButton>
                </div>
            </div>
        </div>
    </div>
</template>
