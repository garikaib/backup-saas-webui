<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({ title: 'Profile' })

const profileModalOpen = ref(true)
const router = useRouter()

// When modal closes, go back
watch(profileModalOpen, (isOpen) => {
  if (!isOpen) {
    router.back()
  }
})
</script>

<template>
  <div>
    <ProfileModal v-model:open="profileModalOpen" />
  </div>
</template>
