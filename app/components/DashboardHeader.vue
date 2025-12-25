<script setup lang="ts">
const authStore = useAuthStore()
defineEmits(['toggleSidebar'])

const items = computed(() => [
  [{
    label: 'Profile',
    avatar: {
      src: 'https://avatars.githubusercontent.com/u/739984?v=4'
    }
  }], 
  [{
    label: 'Logout',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: () => {
      authStore.logout()
    }
  }]
])
</script>

<template>
  <header class="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sm:px-6 z-10 lg:hidden">
    <div class="flex items-center gap-4">
       <UButton 
         icon="i-heroicons-bars-3" 
         color="neutral" 
         variant="ghost" 
         @click="$emit('toggleSidebar')" 
       />
       <AppLogo class="h-6" />
    </div>

    <div class="flex items-center gap-4">
      <UColorModeButton />
      
      <UDropdownMenu :items="items" :popper="{ placement: 'bottom-end' }">
        <UAvatar src="https://avatars.githubusercontent.com/u/739984?v=4" alt="Avatar" />
      </UDropdownMenu>
    </div>
  </header>
  
  <!-- Desktop Header (optional if Sidebar handles logo, but usually we want user menu top right) -->
  <header class="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hidden lg:flex items-center justify-between px-6 z-10 w-full">
      <div class="flex-1"></div> <!-- Spacer -->
      <div class="flex items-center gap-4">
          <UColorModeButton />
          <UDropdownMenu :items="items" :popper="{ placement: 'bottom-end' }">
            <UAvatar src="https://avatars.githubusercontent.com/u/739984?v=4" alt="Avatar" />
          </UDropdownMenu>
      </div>
  </header>
</template>
