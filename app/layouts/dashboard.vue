<script setup lang="ts">
const isOpen = ref(false)
</script>

<template>
  <div class="h-screen flex bg-gray-50 dark:bg-gray-950 overflow-hidden">
    <!-- Desktop Sidebar -->
    <DashboardSidebar class="hidden lg:flex" />

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <DashboardHeader @toggle-sidebar="isOpen = true" />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <!-- Mobile Sidebar -->
    <USlideover v-model="isOpen" side="left" class="lg:hidden">
       <DashboardSidebar class="flex w-full" />
    </USlideover>
  </div>
</template>
