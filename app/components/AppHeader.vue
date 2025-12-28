<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()

// For public pages, show sign in/up buttons
// For authenticated users, redirect header links to dashboard items
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/" class="flex items-center gap-2">
        <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-7 h-7 text-primary" />
        <span class="font-bold text-lg">Backup Admin</span>
      </NuxtLink>
    </template>

    <template #right>
      <UColorModeButton />

      <template v-if="!isAuthenticated">
        <UButton
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
          to="/login"
          class="lg:hidden"
        />

        <UButton
          label="Sign in"
          color="neutral"
          variant="outline"
          to="/login"
          class="hidden lg:inline-flex"
        />
      </template>
      
      <template v-else>
        <UButton
          label="Dashboard"
          color="primary"
          to="/"
          class="hidden lg:inline-flex"
        />
      </template>
    </template>

    <template #body>
      <template v-if="!isAuthenticated">
        <UButton
          label="Sign in"
          color="neutral"
          variant="subtle"
          to="/login"
          block
          class="mb-3"
        />
      </template>
      <template v-else>
        <UButton
          label="Dashboard"
          color="primary"
          to="/"
          block
        />
      </template>
    </template>
  </UHeader>
</template>
