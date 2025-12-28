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
        <h1 class="text-4xl font-bold mb-4 text-center">Join Backup Admin</h1>
        <p class="text-lg text-gray-400 text-center max-w-md">
          Start managing your WordPress backups securely today.
        </p>
      </div>
    </div>

    <!-- Right side - Signup Form -->
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h2>
            <p class="text-gray-500 mt-2">
              Already have an account? 
              <NuxtLink to="/login" class="text-primary hover:underline font-medium">Log in</NuxtLink>
            </p>
          </div>

          <form @submit.prevent="onSubmit" class="space-y-6">
            <UFormField label="Full Name" name="name" required>
              <UInput 
                v-model="state.full_name" 
                placeholder="John Doe"
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormField>

            <UFormField label="Email" name="email" required>
              <UInput 
                v-model="state.email" 
                type="email"
                placeholder="john@example.com"
                icon="i-heroicons-envelope"
                size="lg"
              />
            </UFormField>

            <UFormField label="Password" name="password" required>
              <PasswordStrength :password="state.password" :show-requirements="true" @update:valid="isPasswordValid = $event">
                  <UInput 
                    v-model="state.password" 
                    type="password"
                    placeholder="Create a strong password"
                    icon="i-heroicons-lock-closed"
                    size="lg"
                  />
              </PasswordStrength>
            </UFormField>

            <UButton 
              type="submit" 
              block 
              size="lg"
              :loading="loading"
              :disabled="!isFormValid"
            >
              <template v-if="!loading">
                Create Account
              </template>
              <template v-else>
                Creating...
              </template>
            </UButton>
          </form>

          <p class="text-center text-xs text-gray-500 mt-6">
            By signing up, you agree to our <a href="#" class="text-primary hover:underline">Terms of Service</a> and <a href="#" class="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PasswordStrength from '~/components/PasswordStrength.vue'

definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Sign up',
  description: 'Create an account'
})

const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)

const state = reactive({
  full_name: '',
  email: '',
  password: ''
})

const isPasswordValid = ref(false)

const isFormValid = computed(() => 
  state.full_name.length > 0 &&
  state.email.length > 0 && 
  state.password.length > 0 &&
  isPasswordValid.value
)

async function onSubmit() {
  if (!isFormValid.value) return
  
  loading.value = true
  try {
    // Note: ensure 'register' action is added to auth store!
    await (authStore as any).register({
        full_name: state.full_name,
        email: state.email,
        password: state.password
    })
    
    toast.add({ 
      title: 'Account Created', 
      description: 'Please check your email to verify your account.', 
      color: 'success' 
    })
    navigateTo('/login')
  } catch (error: any) {
    toast.add({ 
      title: 'Signup Failed', 
      description: error?.data?.detail || 'Could not create account', 
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
