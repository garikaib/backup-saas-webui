<script setup lang="ts">
import type { NodeDetailResponse } from '~/types/node'

const props = defineProps<{
    node: NodeDetailResponse
}>()

function getGaugeColor(percent: number) {
    if (percent > 90) return '#ef4444' // red-500
    if (percent > 70) return '#f59e0b' // yellow-500
    return '#3b82f6' // blue-500
}

const radius = 30
const circumference = 2 * Math.PI * radius

function getDashOffset(percent: number) {
    const val = Math.max(0, Math.min(100, percent))
    return circumference - (val / 100) * circumference
}
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- CPU Gauge -->
        <UCard>
            <div class="flex items-center justify-between mb-2">
                 <div class="text-sm font-medium text-gray-500">CPU Load</div>
                 <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-gray-400" />
            </div>
            <div class="flex items-center justify-center py-2">
                <div class="relative w-24 h-24">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="48" cy="48" :r="radius"
                            stroke="currentColor" stroke-width="8" fill="transparent"
                            class="text-gray-200 dark:text-gray-700"
                        />
                        <template v-if="node.cpu_usage !== undefined">
                            <circle
                                cx="48" cy="48" :r="radius"
                                :stroke="getGaugeColor(node.cpu_usage)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out"
                                stroke-linecap="round"
                                :stroke-dasharray="circumference"
                                :stroke-dashoffset="getDashOffset(node.cpu_usage)"
                            />
                        </template>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center flex-col">
                        <span class="text-xl font-bold">{{ node.cpu_usage !== undefined ? node.cpu_usage + '%' : 'N/A' }}</span>
                    </div>
                </div>
            </div>
        </UCard>

        <!-- Memory Gauge -->
        <UCard>
            <div class="flex items-center justify-between mb-2">
                 <div class="text-sm font-medium text-gray-500">RAM Usage</div>
                 <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-gray-400" />
            </div>
            <div class="flex items-center justify-center py-2">
                <div class="relative w-24 h-24">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="48" cy="48" :r="radius"
                            stroke="currentColor" stroke-width="8" fill="transparent"
                            class="text-gray-200 dark:text-gray-700"
                        />
                        <template v-if="node.memory_usage !== undefined">
                            <circle
                                cx="48" cy="48" :r="radius"
                                :stroke="getGaugeColor(node.memory_usage)" stroke-width="8" fill="transparent"
                                class="transition-all duration-500 ease-out"
                                stroke-linecap="round"
                                :stroke-dasharray="circumference"
                                :stroke-dashoffset="getDashOffset(node.memory_usage)"
                            />
                        </template>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center flex-col">
                        <span class="text-xl font-bold">{{ node.memory_usage !== undefined ? node.memory_usage + '%' : 'N/A' }}</span>
                    </div>
                </div>
            </div>
        </UCard>

        <!-- Disk Usage -->
        <UCard>
            <div class="flex items-center justify-between mb-4">
                 <div class="text-sm font-medium text-gray-500">System Disk</div>
                 <UIcon name="i-heroicons-circle-stack" class="w-5 h-5 text-gray-400" />
            </div>
            <div class="space-y-4">
                <div class="flex justify-between items-end">
                    <div>
                        <div class="text-2xl font-bold">{{ node.disk_usage !== undefined ? node.disk_usage + '%' : 'N/A' }}</div>
                    </div>
                    <div class="text-right">
                         <div class="text-xs text-gray-400">Quota: {{ node.storage_quota_gb }} GB</div>
                    </div>
                </div>
                <!-- Bar -->
                <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        v-if="node.disk_usage !== undefined"
                        class="h-full transition-all duration-500"
                        :style="{ width: `${node.disk_usage}%`, backgroundColor: getGaugeColor(node.disk_usage) }"
                    ></div>
                </div>
                <div class="text-xs text-gray-500 text-center">
                    {{ node.disk_usage !== undefined ? node.disk_usage + '% Used' : 'Usage Unknown' }}
                </div>
            </div>
        </UCard>

        <!-- Active Jobs -->
        <UCard>
            <div class="flex items-center justify-between mb-4">
                 <div class="text-sm font-medium text-gray-500">Active Jobs</div>
                 <UIcon name="i-heroicons-command-line" class="w-5 h-5 text-gray-400" />
            </div>
            <div class="flex flex-col items-center justify-center h-24">
                <div class="text-4xl font-bold text-gray-900 dark:text-white">
                    {{ node.active_backups || 0 }}
                </div>
                <div v-if="node.active_backups" class="flex items-center gap-2 mt-2 text-primary-500 text-sm">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Running
                </div>
                <div v-else class="mt-2 text-gray-400 text-sm">
                    All clear
                </div>
            </div>
        </UCard>
    </div>
</template>
