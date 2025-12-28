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
              <UIcon :name="getIconName" class="w-8 h-8 text-primary" />
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ getTitle }}</h2>
            <p class="text-gray-500 mt-2">
              {{ getSubtitle }}
            </p>
          </div>

          <!-- Rate limit warning -->
          <div v-if="rateLimitError" class="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
             <div class="flex gap-3">
               <UIcon name="i-heroicons-clock" class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
               <div class="text-sm">
                 <p class="font-medium text-red-800 dark:text-red-300">Too many attempts</p>
                 <p class="text-red-700 dark:text-red-400 mt-1">
                   Please try again later. {{ rateLimitCountdown > 0 ? `Retrying in ${rateLimitCountdown}s` : '' }}
                 </p>
               </div>
             </div>
          </div>

          <!-- Verification Required Form -->
          <div v-if="verificationRequired" class="space-y-4">
            <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div class="flex gap-3">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div class="text-sm">
                  <p class="font-medium text-amber-800 dark:text-amber-300">Email verification required</p>
                  <p class="text-amber-700 dark:text-amber-400 mt-1">
                    Please enter the 6-character code sent to <strong>{{ verificationEmail }}</strong>
                  </p>
                </div>
              </div>
            </div>

            <form @submit.prevent="onSubmitVerification" class="space-y-4">
              <UFormField label="Verification Code" required>
                <UInput 
                  v-model="verificationCode" 
                  placeholder="ABC123"
                  size="lg"
                  class="font-mono text-lg tracking-widest text-center"
                  maxlength="6"
                  required
                />
              </UFormField>

              <UButton 
                type="submit" 
                block 
                size="lg"
                :loading="verifyingCode"
                :disabled="verificationCode.length < 6"
              >
                <template v-if="!verifyingCode">
                  <UIcon name="i-heroicons-check-badge" class="mr-2" />
                  Verify Email
                </template>
                <template v-else>Verifying...</template>
              </UButton>

              <button 
                type="button" 
                @click="cancelVerification"
                class="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Back to login
              </button>
            </form>
          </div>

           <!-- MFA Required Form -->
          <div v-else-if="mfaRequired" class="space-y-4">
            <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div class="flex gap-3">
                <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div class="text-sm">
                  <p class="font-medium text-blue-800 dark:text-blue-300">Two-Factor Authentication</p>
                  <p class="text-blue-700 dark:text-blue-400 mt-1">
                    Please enter the code from your authenticator app.
                  </p>
                </div>
              </div>
            </div>

            <form @submit.prevent="onSubmitMfa" class="space-y-4">
              <UFormField label="Authentication Code" required>
                <UInput 
                  v-model="mfaCode" 
                  placeholder="123456"
                  size="lg"
                  class="font-mono text-lg tracking-widest text-center"
                  maxlength="6"
                  required
                  autofocus
                />
              </UFormField>

              <UButton 
                type="submit" 
                block 
                size="lg"
                :loading="verifyingMfa"
                :disabled="mfaCode.length < 6"
              >
                <template v-if="!verifyingMfa">
                  <UIcon name="i-heroicons-lock-closed" class="mr-2" />
                  Verify Login
                </template>
                <template v-else>Verifying...</template>
              </UButton>

              <button 
                type="button" 
                @click="cancelMfa"
                class="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Back to login
              </button>
            </form>
          </div>

          <!-- Magic Link Success -->
          <div v-else-if="magicLinkSent" class="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-green-800 dark:text-green-300">Check your email</p>
                <p class="text-green-700 dark:text-green-400 mt-1">
                  If the email exists, you'll receive a login link shortly. Click the link to sign in.
                </p>
              </div>
            </div>
          </div>

          <!-- Password Login Form -->
          <UForm v-else-if="!useMagicLink" :schema="schema" :state="state" @submit="onSubmit" class="space-y-6">
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

            <!-- Turnstile Widget -->
            <div v-if="turnstileEnabled" class="flex justify-center">
              <div 
                ref="turnstileContainer"
                class="cf-turnstile"
              ></div>
            </div>

            <UButton 
              type="submit" 
              block 
              size="lg"
              :loading="loading"
              :disabled="turnstileEnabled && !turnstileToken"
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

          <!-- Magic Link Form -->
          <form v-else @submit.prevent="onSubmitMagicLink" class="space-y-6">
            <UFormField label="Email Address">
              <UInput 
                v-model="magicLinkEmail" 
                type="email"
                placeholder="your@email.com"
                icon="i-heroicons-envelope"
                size="lg"
                class="transition-all duration-200"
                required
              />
            </UFormField>

            <UButton 
              type="submit" 
              block 
              size="lg"
              :loading="loading"
              :disabled="!magicLinkEmail"
              class="mt-8 transition-all duration-300"
            >
              <template v-if="!loading">
                <UIcon name="i-heroicons-paper-airplane" class="mr-2" />
                Send Login Link
              </template>
              <template v-else>
                Sending...
              </template>
            </UButton>
          </form>

          <!-- Toggle between modes -->
          <div v-if="!verificationRequired && !mfaRequired" class="mt-6 text-center">
            <button 
              type="button"
              @click="toggleLoginMode"
              class="text-sm text-primary hover:underline focus:outline-none"
            >
              {{ useMagicLink ? 'Sign in with password instead' : 'Sign in with magic link' }}
            </button>
          </div>

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
const config = useRuntimeConfig()
const toast = useToast()
const loading = ref(false)

// Login modes
const useMagicLink = ref(false)
const magicLinkEmail = ref('')
const magicLinkSent = ref(false)

// Verification state
const verificationRequired = ref(false)
const verificationUserId = ref<number | null>(null)
const verificationEmail = ref('')
const verificationToken = ref('') // New token from 403 response
const verificationCode = ref('')
const verifyingCode = ref(false)

// MFA state
const mfaRequired = ref(false)
const mfaCode = ref('')
const verifyingMfa = ref(false)

// Rate limiting
const rateLimitError = ref(false)
const rateLimitCountdown = ref(0)
let countdownInterval: NodeJS.Timeout | null = null

// Turnstile
const turnstileEnabled = ref(false)
const turnstileSiteKey = ref('')
const turnstileToken = ref('')
const turnstileContainer = ref<HTMLElement | null>(null)

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  password: ''
})

// Dynamic UI Text
const getIconName = computed(() => {
    if (verificationRequired.value) return 'i-heroicons-check-badge'
    if (mfaRequired.value) return 'i-heroicons-shield-check'
    if (useMagicLink.value) return 'i-heroicons-envelope'
    return 'i-heroicons-lock-closed'
})

const getTitle = computed(() => {
    if (verificationRequired.value) return 'Verify Email'
    if (mfaRequired.value) return 'Verify Login'
    return 'Welcome back'
})

const getSubtitle = computed(() => {
    if (verificationRequired.value) return 'Complete email verification to continue'
    if (mfaRequired.value) return 'Enter your authentication code'
    return useMagicLink.value ? 'Get a login link via email' : 'Sign in to access your dashboard'
})

// Fetch Turnstile config
onMounted(async () => {
  try {
    const response = await $fetch<{ site_key: string; enabled: boolean }>('/settings/public/turnstile-site-key', {
      baseURL: config.public.apiBase
    })
    turnstileEnabled.value = response.enabled
    turnstileSiteKey.value = response.site_key
    
    if (response.enabled && response.site_key) {
      await loadTurnstile()
    }
  } catch (error) {
    console.error('Failed to load Turnstile config:', error)
  }
})

async function loadTurnstile() {
  // Load Turnstile script if not already loaded
  if (!document.querySelector('script[src*="turnstile"]')) {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    
    await new Promise(resolve => {
      script.onload = resolve
    })
  }

  // Wait for render and init
  await nextTick()
  
  // Render Turnstile widget
  if (turnstileContainer.value && (window as any).turnstile) {
    (window as any).turnstile.render(turnstileContainer.value, {
      sitekey: turnstileSiteKey.value,
      callback: (token: string) => {
        turnstileToken.value = token
      },
      'expired-callback': () => {
        turnstileToken.value = ''
      },
      'error-callback': () => {
        turnstileToken.value = ''
        toast.add({ title: 'Captcha Error', description: 'Please reload the page', color: 'error' })
      }
    })
  }
}

function toggleLoginMode() {
  useMagicLink.value = !useMagicLink.value
  magicLinkSent.value = false
  verificationRequired.value = false
  mfaRequired.value = false
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  // Check Turnstile if enabled
  if (turnstileEnabled.value && !turnstileToken.value) {
    toast.add({ title: 'Please complete the captcha', color: 'warning' })
    return
  }

  // Reset errors
  verificationRequired.value = false
  mfaRequired.value = false
  rateLimitError.value = false
  loading.value = true

  try {
    await authStore.login(
      payload.data.username, 
      payload.data.password,
      turnstileEnabled.value ? turnstileToken.value : undefined
    )
    toast.add({ 
      title: 'Welcome back!', 
      description: 'You have successfully logged in.', 
      color: 'success' 
    })
    navigateTo('/')
  } catch (error: any) {
    // Handle Special Cases
    if (error?.message === 'MFA_REQUIRED') {
        mfaRequired.value = true
        return // Stop here
    }

    if (error?.message === 'EMAIL_NOT_VERIFIED' && error?.userId) {
      verificationRequired.value = true
      verificationUserId.value = error.userId
      verificationEmail.value = error.email || state.username
      verificationToken.value = error.verificationToken || ''
      verificationCode.value = ''
      return // Stop here
    }

    if (error?.message === 'RATE_LIMIT_EXCEEDED') {
        rateLimitError.value = true
        if (error.retryAfter) {
            startRateLimitCountdown(error.retryAfter)
        }
    }

    const message = error?.message === 'RATE_LIMIT_EXCEEDED' 
        ? 'Too many attempts. Please try again later.'
        : (error?.data?.detail || 'Invalid credentials')
    
    toast.add({ 
      title: 'Login Failed', 
      description: message, 
      color: 'error' 
    })
    
    // Reset Turnstile on failure
    if ((window as any).turnstile && turnstileContainer.value) {
      (window as any).turnstile.reset(turnstileContainer.value)
      turnstileToken.value = ''
    }
  } finally {
    loading.value = false
  }
}

function startRateLimitCountdown(seconds: number) {
    rateLimitCountdown.value = seconds
    if (countdownInterval) clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
        rateLimitCountdown.value--
        if (rateLimitCountdown.value <= 0) {
            if (countdownInterval) clearInterval(countdownInterval)
            rateLimitError.value = false
        }
    }, 1000)
}

// MFA Submission
async function onSubmitMfa() {
    if (!mfaCode.value) return
    verifyingMfa.value = true
    try {
        await authStore.verifyMfa(mfaCode.value)
        toast.add({ 
            title: 'Welcome back!', 
            description: 'MFA verified successfully.', 
            color: 'success' 
        })
        navigateTo('/')
    } catch (error: any) {
        toast.add({ 
            title: 'Verification Failed', 
            description: error?.data?.detail || 'Invalid authentication code', 
            color: 'error' 
        })
    } finally {
        verifyingMfa.value = false
    }
}

async function onSubmitMagicLink() {
  if (!magicLinkEmail.value) return
  
  loading.value = true
  try {
    await authStore.requestMagicLink(magicLinkEmail.value)
    magicLinkSent.value = true
    toast.add({ 
      title: 'Check your email', 
      description: 'If the email exists, you will receive a login link.', 
      color: 'success' 
    })
  } catch (error: any) {
    const message = error?.data?.detail || 'Failed to send magic link.'
    toast.add({ 
      title: 'Error', 
      description: message, 
      color: 'error' 
    })
  } finally {
    loading.value = false
  }
}

// Verification submission
async function onSubmitVerification() {
  if (!verificationUserId.value || !verificationCode.value) return
  
  verifyingCode.value = true
  try {
    // Pass verificationToken if available
    await authStore.verifyEmail(verificationUserId.value, verificationCode.value, verificationToken.value)
    toast.add({ 
      title: 'Email verified!', 
      description: 'Your email has been verified. Please sign in again.', 
      color: 'success' 
    })
    // Reset to login form
    cancelVerification()
  } catch (error: any) {
    const message = error?.data?.detail || 'Invalid verification code.'
    toast.add({ 
      title: 'Verification Failed', 
      description: message, 
      color: 'error' 
    })
  } finally {
    verifyingCode.value = false
  }
}

function cancelVerification() {
  verificationRequired.value = false
  verificationUserId.value = null
  verificationEmail.value = ''
  verificationCode.value = ''
  verificationToken.value = ''
}

function cancelMfa() {
    mfaRequired.value = false
    mfaCode.value = ''
    // Also likely want to show login form again, which is default state when flags are false
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

