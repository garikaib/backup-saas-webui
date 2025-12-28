<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()

const links = computed<NavigationMenuItem[]>(() => {
    const items: NavigationMenuItem[] = [
        {
            label: 'Overview',
            type: 'label'
        },
        {
            label: 'Dashboard',
            icon: 'i-heroicons-squares-2x2',
            to: '/'
        }
    ]

    // Management Section - Node Admin & Up
    if (authStore.isNodeAdminOrHigher) {
        items.push({
            label: 'Management',
            type: 'label',
            class: 'mt-4'
        })
        
        items.push(
            {
                label: 'Nodes',
                icon: 'i-heroicons-server',
                to: '/nodes'
            },
            {
                label: 'Sites',
                icon: 'i-heroicons-globe-alt',
                to: '/sites'
            }
        )
        
        // Users - Super Admin Only
        if (authStore.isSuperAdmin) {
             items.push({
                label: 'Users',
                icon: 'i-heroicons-users',
                to: '/users'
            })
        }

        items.push(
            {
                label: 'Storage',
                icon: 'i-heroicons-circle-stack',
                to: '/storage'
            },
            {
                label: 'Jobs',
                icon: 'i-heroicons-command-line',
                to: '/jobs'
            },
            {
                label: 'Activity Logs',
                icon: 'i-heroicons-clock',
                to: '/activity-logs'
            }
        )
    }
    
    // Site Admin - Sites access only
    if (authStore.isSiteAdmin) {
        items.push({
            label: 'Management',
            type: 'label',
            class: 'mt-4'
        })
        items.push({
            label: 'Sites',
            icon: 'i-heroicons-globe-alt',
            to: '/sites'
        })
    }

    items.push(
        {
            label: 'Settings',
            type: 'label',
            class: 'mt-4'
        },
        {
            label: 'Themes',
            icon: 'i-heroicons-swatch',
            to: '/settings'
        },
        {
            label: 'Profile',
            icon: 'i-heroicons-user-circle',
            to: '/profile'
        }
    )

    // Admin Settings - Super Admin Only
    if (authStore.isSuperAdmin) {
        items.push(
            {
                label: 'Communications',
                icon: 'i-heroicons-envelope',
                to: '/communications'
            },
            {
                label: 'System Logs',
                icon: 'i-heroicons-command-line',
                to: '/system-logs'
            },
            {
                label: 'Admin Settings',
                icon: 'i-heroicons-cog-6-tooth',
                to: '/admin-settings'
            }
        )
    }

    return items
})
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
