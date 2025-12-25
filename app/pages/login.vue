<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login',
  description: 'Login to your account to continue'
})

const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)

const fields = [{
  name: 'username',
  type: 'text' as const,
  label: 'Username',
  placeholder: 'Enter your username',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password' as const,
  placeholder: 'Enter your password',
  required: true
}]

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await authStore.login(payload.data.username, payload.data.password)
    toast.add({ title: 'Welcome back!', description: 'You have successfully logged in.', color: 'success' })
    navigateTo('/')
  } catch (error) {
    toast.add({ title: 'Login Failed', description: 'Invalid username or password.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    title="Admin Console"
    description="Login to manage your SaaS infrastructure"
    icon="i-heroicons-lock-closed"
    :loading="loading"
    @submit="onSubmit"
  />
</template>

