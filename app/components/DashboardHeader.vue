<script setup lang="ts">
const authStore = useAuthStore()
defineEmits(['toggleSidebar'])

const profileModalOpen = ref(false)

function handleLogout() {
  authStore.logout()
}

function openProfile() {
  profileModalOpen.value = true
}

const items = [
  [{
    label: 'Profile',
    icon: 'i-heroicons-user-circle',
    onSelect: openProfile
  }], 
  [{
    label: 'Logout',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: handleLogout
  }]
]
</script>

<template>
  <header class="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sm:px-6 z-10 w-full">
      <!-- Left side: Toggle + Logo (Mobile only) -->
      <div class="flex items-center gap-4 lg:hidden">
         <UButton 
            icon="i-heroicons-bars-3" 
            color="neutral" 
            variant="ghost" 
            @click="$emit('toggleSidebar')" 
          />
         <AppLogo class="h-6" />
      </div>

      <!-- Spacer for Desktop to push right actions -->
      <div class="hidden lg:flex lg:flex-1"></div>

      <!-- Right side: User Menu -->
      <div class="flex items-center gap-4">
          <UColorModeButton />
          <UDropdownMenu :items="items" :popper="{ placement: 'bottom-end' }">
            <UAvatar 
              :alt="authStore.user?.full_name || authStore.user?.email || 'User'"
              size="sm"
            />
          </UDropdownMenu>
      </div>

      <!-- Profile Modal -->
      <ProfileModal v-model:open="profileModalOpen" />
  </header>
</template>
