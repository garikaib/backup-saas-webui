<template>
  <div class="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <!-- Left side - Branding -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <!-- Animated background -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10"></div>
      <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      </div>
      
      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
        <div class="flex items-center gap-3 mb-8">
          <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-16 h-16 text-primary" />
        </div>
        <h1 class="text-4xl font-bold mb-4 text-center">Backup Admin</h1>
        <p class="text-lg text-gray-400 text-center max-w-md">
          Centralized backup management for your WordPress infrastructure
        </p>
        
        <!-- Features list -->
        <div class="mt-12 space-y-4">
          <div class="flex items-center gap-3 text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-primary" />
            <span>Monitor all backup nodes</span>
          </div>
          <div class="flex items-center gap-3 text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-primary" />
            <span>Manage storage quotas</span>
          </div>
          <div class="flex items-center gap-3 text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-primary" />
            <span>Track activity & audit logs</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Login Form -->
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center justify-center gap-3 mb-8">
          <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-10 h-10 text-primary" />
          <span class="text-2xl font-bold text-white">Backup Admin</span>
        </div>

        <!-- Login card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:shadow-primary/10">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <UIcon name="i-heroicons-lock-closed" class="w-8 h-8 text-primary" />
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p class="text-gray-500 mt-2">Sign in to access your dashboard</p>
          </div>

          <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6">
            <UFormField label="Email / Username" name="username">
              <UInput 
                v-model="state.username" 
                placeholder="admin@example.com"
                icon="i-heroicons-user"
                size="lg"
                class="transition-all duration-200"
              />
            </UFormField>

            <UFormField label="Password" name="password">
              <UInput 
                v-model="state.password" 
                type="password"
                placeholder="••••••••"
                icon="i-heroicons-lock-closed"
                size="lg"
                class="transition-all duration-200"
              />
            </UFormField>

            <UButton 
              type="submit" 
              block 
              size="lg"
              :loading="loading"
              class="mt-8 transition-all duration-300"
            >
              <template v-if="!loading">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
                Sign In
              </template>
              <template v-else>
                Signing in...
              </template>
            </UButton>
          </UForm>

          <p class="text-center text-sm text-gray-500 mt-6">
            Protected by Backup Admin
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Login',
  description: 'Login to Backup Admin dashboard'
})

const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  password: ''
})

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await authStore.login(payload.data.username, payload.data.password)
    toast.add({ 
      title: 'Welcome back!', 
      description: 'You have successfully logged in.', 
      color: 'success' 
    })
    navigateTo('/')
  } catch (error) {
    toast.add({ 
      title: 'Login Failed', 
      description: 'Invalid username or password.', 
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 4s ease-in-out infinite;
}
</style>
