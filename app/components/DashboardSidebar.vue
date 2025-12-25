<script setup lang="ts">
const links = [
    {
        label: 'Overview',
        type: 'label'
    },
    {
        label: 'Dashboard',
        icon: 'i-heroicons-squares-2x2',
        to: '/'
    },
    {
        label: 'Management',
        type: 'label',
        class: 'mt-4'
    },
    {
        label: 'Nodes',
        icon: 'i-heroicons-server',
        to: '/nodes'
    }
] as const
</script>

<template>
    <div class="h-full flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 w-64">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center">
             <AppLogo class="h-6" />
        </div>
        
        <div class="flex-1 p-4">
             <UNavigationMenu :items="links" orientation="vertical" />
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-gray-800">
             <div class="text-xs text-center text-gray-500">v1.0.0</div>
        </div>
    </div>
</template>
