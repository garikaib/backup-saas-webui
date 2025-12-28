<script setup lang="ts">
import type {
  CommunicationChannel, 
  ChannelCreate, 
  ChannelListResponse, 
  ChannelTestResponse,
  ChannelType,
  MessageRole,
  ProviderListResponse,
  ProviderSchema,
  ConfigField,
  MESSAGE_ROLES
} from '~/types/communication-channel'
import { DialogTitle, DialogDescription } from 'reka-ui'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({ title: 'Communication Channels' })

const authStore = useAuthStore()
const client = useApiClient()
const toast = useToast()
const dialog = useDialog()

// Redirect non-super admins
if (!authStore.isSuperAdmin) {
  navigateTo('/')
}

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'channel_type', accessorKey: 'channel_type', header: 'Type' },
  { id: 'provider', accessorKey: 'provider', header: 'Provider' },
  { id: 'priority', accessorKey: 'priority', header: 'Priority' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

// Fetch channels
const { data: channelsData, refresh, status } = await useAsyncData('channels-list', () =>
  client<ChannelListResponse>('/communications/channels')
)

// Fetch providers for dynamic configuration
const { data: providersData } = await useAsyncData('providers-list', () =>
  client<ProviderListResponse>('/communications/providers')
)

const channels = computed(() => channelsData.value?.channels || [])
const providers = computed(() => providersData.value?.providers || [])

// Modal state
const isModalOpen = ref(false)
const editingChannel = ref<CommunicationChannel | null>(null)
const isSubmitting = ref(false)

// Test modal state
const isTestModalOpen = ref(false)
const testingChannel = ref<CommunicationChannel | null>(null)
const testRecipient = ref('')
const isTesting = ref(false)

// Form state
const formData = reactive<ChannelCreate & { id?: number; is_active?: boolean }>({
  name: '',
  channel_type: 'email',
  provider: 'sendpulse_api',
  config: {},
  allowed_roles: ['verification', 'notification'],
  is_default: false,
  priority: 10
})

const channelTypes: { label: string; value: ChannelType }[] = [
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Push', value: 'push' }
]

const providerOptions = computed(() => {
  if (!providers.value) return []
  
  return providers.value
    .filter(p => p.channel_type === formData.channel_type)
    .map(p => ({
      value: p.provider_name,
      label: formatProvider(p.provider_name)
    }))
})

const currentProviderSchema = computed(() => {
  return providers.value.find(
    p => p.channel_type === formData.channel_type && p.provider_name === formData.provider
  )
})

// Initialize config object when provider changes
watch(() => formData.provider, (newProvider) => {
  // If we are editing, don't overwrite the config immediately if it matches the current provider
  if (editingChannel.value && editingChannel.value.provider === newProvider && editingChannel.value.channel_type === formData.channel_type) {
    // Keep existing config
    formData.config = { ...editingChannel.value.config }
  } else {
    // Reset config for new provider
    const schema = providers.value.find(p => p.channel_type === formData.channel_type && p.provider_name === newProvider)?.config_schema || {}
    const newConfig: Record<string, any> = {}
    
    // Initialize with defaults if possible (empty for now)
    for (const key in schema) {
      newConfig[key] = '' 
      if (schema[key]?.type === 'integer') newConfig[key] = 0
       if (schema[key]?.type === 'boolean') newConfig[key] = false
    }
    formData.config = newConfig
  }
})

const roleOptions: { label: string; value: MessageRole }[] = [
  { value: 'verification', label: 'Verification' },
  { value: 'notification', label: 'Notification' },
  { value: 'alert', label: 'Alert' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'login_link', label: 'Login Link' }
]

// Watch channel type to reset provider

watch(() => formData.channel_type, (newType) => {
  const opts = providers.value
    .filter(p => p.channel_type === newType)
    .map(p => p.provider_name)
    
  if (opts.length > 0 && !opts.includes(formData.provider)) {
    formData.provider = opts[0] || ''
  } else if (opts.length === 0) {
    formData.provider = ''
  }
})

const encryptionOptions = [
  { label: 'None', value: 'none' },
  { label: 'SSL', value: 'ssl' },
  { label: 'TLS', value: 'tls' },
  { label: 'STARTTLS', value: 'starttls' }
]

// Auto-detect encryption based on port
watch(() => formData.config?.port, (newPort) => {
  if (!newPort) return
  // Only auto-set if encryption is currently empty or user hasn't manually set a non-none value (optional heuristic)
  // For now, simple auto-suggest:
  const port = Number(newPort)
  if (port === 465) {
    formData.config.encryption = 'ssl'
  } else if (port === 587) {
    formData.config.encryption = 'tls'
  } else if (port === 25) {
    formData.config.encryption = 'none'
  }
})

function openCreateModal() {
  editingChannel.value = null
  Object.assign(formData, {
    name: '',
    channel_type: 'email',
    provider: 'sendpulse_api',
    config: {},
    allowed_roles: ['verification', 'notification'],
    is_default: false,
    is_active: true,
    priority: 10
  })
  isModalOpen.value = true
}

function openEditModal(channel: CommunicationChannel) {
  editingChannel.value = channel
  Object.assign(formData, {
    id: channel.id,
    name: channel.name,
    channel_type: channel.channel_type,
    provider: channel.provider,
    config: channel.config || {},
    allowed_roles: channel.allowed_roles,
    is_default: channel.is_default,
    is_active: channel.is_active,
    priority: channel.priority
  })
  isModalOpen.value = true
}

async function submitForm() {
  isSubmitting.value = true
  try {
    if (editingChannel.value) {
      await client(`/communications/channels/${editingChannel.value.id}`, {
        method: 'PUT',
        body: {
          name: formData.name,
          config: formData.config,
          allowed_roles: formData.allowed_roles,
          is_default: formData.is_default,
          is_active: formData.is_active,
          priority: formData.priority
        }
      })
      toast.add({ title: 'Success', description: 'Channel updated.', color: 'success' })
    } else {
      await client('/communications/channels', {
        method: 'POST',
        body: formData
      })
      toast.add({ title: 'Success', description: 'Channel created.', color: 'success' })
    }
    isModalOpen.value = false
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to save channel', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function deleteChannel(channel: CommunicationChannel) {
  const confirmed = await dialog.confirm({
    title: 'Delete Channel',
    message: `Delete "${channel.name}"? This cannot be undone.`,
    variant: 'danger',
    confirmLabel: 'Delete'
  })
  if (!confirmed) return

  try {
    await client(`/communications/channels/${channel.id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Channel deleted.', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to delete', color: 'error' })
  }
}

function openTestModal(channel: CommunicationChannel) {
  testingChannel.value = channel
  testRecipient.value = ''
  isTestModalOpen.value = true
}

async function testChannel() {
  if (!testingChannel.value || !testRecipient.value) return
  
  isTesting.value = true
  try {
    const result = await client<ChannelTestResponse>(`/communications/channels/${testingChannel.value.id}/test`, {
      method: 'POST',
      body: { to: testRecipient.value }
    })
    if (result.success) {
      toast.add({ title: 'Test Successful', description: result.message, color: 'success' })
      isTestModalOpen.value = false
    } else {
      toast.add({ title: 'Test Failed', description: result.message, color: 'error' })
    }
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Test failed', color: 'error' })
  } finally {
    isTesting.value = false
  }
}

function getTypeIcon(type: ChannelType): string {
  const icons: Record<ChannelType, string> = {
    email: 'i-heroicons-envelope',
    sms: 'i-heroicons-device-phone-mobile',
    whatsapp: 'i-simple-icons-whatsapp',
    push: 'i-heroicons-bell'
  }
  return icons[type] || 'i-heroicons-chat-bubble-left'
}

function getTypeColor(type: ChannelType): 'primary' | 'success' | 'warning' | 'neutral' {
  const colors: Record<ChannelType, 'primary' | 'success' | 'warning' | 'neutral'> = {
    email: 'primary',
    sms: 'success',
    whatsapp: 'success',
    push: 'warning'
  }
  return colors[type] || 'neutral'
}

function formatProvider(provider: string): string {
  if (!provider) return ''
  return provider.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatLabel(key: string): string {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Communication Channels</h1>
        <p class="text-gray-500 text-sm">Manage email, SMS, and notification providers</p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" @click="() => refresh()" />
        <UButton icon="i-heroicons-plus" label="Add Channel" @click="openCreateModal" />
      </div>
    </div>

    <UCard>
      <UTable :data="channels" :columns="columns" :loading="status === 'pending'">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="getTypeIcon(row.original.channel_type)" class="w-5 h-5 text-gray-500" />
            <span class="font-medium">{{ row.original.name }}</span>
            <UBadge v-if="row.original.is_default" color="primary" size="xs">Default</UBadge>
          </div>
        </template>

        <template #channel_type-cell="{ row }">
          <UBadge :color="getTypeColor(row.original.channel_type)" variant="subtle">
            {{ row.original.channel_type.toUpperCase() }}
          </UBadge>
        </template>

        <template #provider-cell="{ row }">
          {{ formatProvider(row.original.provider) }}
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="row.original.is_active ? 'success' : 'neutral'" variant="subtle">
            {{ row.original.is_active ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UTooltip text="Test">
              <UButton 
                size="xs" 
                color="success" 
                variant="ghost" 
                icon="i-heroicons-play"
                @click="openTestModal(row.original)"
              />
            </UTooltip>
            <UButton 
              size="xs" 
              color="neutral" 
              variant="ghost" 
              icon="i-heroicons-pencil"
              @click="openEditModal(row.original)"
            />
            <UButton 
              size="xs" 
              color="error" 
              variant="ghost" 
              icon="i-heroicons-trash"
              @click="deleteChannel(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Info section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 class="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5" />
          Message Roles
        </h3>
        <p class="text-sm text-blue-700 dark:text-blue-400 mt-2">
          Each channel can be assigned specific roles like <strong>verification</strong>, <strong>notification</strong>, 
          <strong>alert</strong>, or <strong>login_link</strong>. Messages are routed to channels based on these roles.
        </p>
      </div>
      <div class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <h3 class="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
          Priority & Failover
        </h3>
        <p class="text-sm text-green-700 dark:text-green-400 mt-2">
          Lower priority numbers are tried first. If one channel fails, the system automatically 
          falls back to the next available channel with the same role.
        </p>
      </div>
    </div>

    <!-- Channel Form Modal -->
    <UModal v-model:open="isModalOpen" class="sm:max-w-3xl">
      <template #content>
        <UCard class="w-full">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <DialogTitle class="font-semibold text-gray-900 dark:text-white">
                  {{ editingChannel ? 'Edit Channel' : 'Add Channel' }}
                </DialogTitle>
                <DialogDescription class="text-sm text-gray-500">
                  Configure provider settings and message routing.
                </DialogDescription>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isModalOpen = false" />
            </div>
          </template>

          <div class="overflow-y-auto max-h-[60vh] -mr-4 pr-4">
            <form id="channel-form" class="space-y-4" @submit.prevent="submitForm">
            <UFormField label="Name" required>
              <UInput v-model="formData.name" placeholder="e.g. Primary Email" required />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Channel Type">
                <USelectMenu 
                  v-model="formData.channel_type" 
                  :items="channelTypes"
                  value-key="value"
                  :disabled="!!editingChannel"
                />
              </UFormField>

              <UFormField label="Provider">
                <USelectMenu 
                  v-model="formData.provider" 
                  :items="providerOptions"
                  value-key="value"
                  :disabled="!!editingChannel"
                />
              </UFormField>
            </div>

            <UFormField label="Allowed Roles">
              <div class="flex flex-wrap gap-2">
                <label 
                  v-for="role in roleOptions" 
                  :key="role.value"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                  :class="formData.allowed_roles.includes(role.value) 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'border-gray-300 dark:border-gray-600'"
                >
                  <input 
                    type="checkbox" 
                    :value="role.value"
                    :checked="formData.allowed_roles.includes(role.value)"
                    class="sr-only"
                    @change="(e: Event) => {
                      const target = e.target as HTMLInputElement
                      if (target.checked) {
                        formData.allowed_roles.push(role.value)
                      } else {
                        formData.allowed_roles = formData.allowed_roles.filter(r => r !== role.value)
                      }
                    }"
                  />
                  <span class="text-sm">{{ role.label }}</span>
                </label>
              </div>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Priority" hint="Lower = higher priority">
                <UInput v-model.number="formData.priority" type="number" min="1" max="100" />
              </UFormField>

              <div class="space-y-4">
                <UFormField label="Default Channel">
                    <USwitch v-model="formData.is_default">
                      <template #label>Mark as default</template>
                    </USwitch>
                </UFormField>
                
                <UFormField v-if="editingChannel" label="Status">
                  <USwitch v-model="formData.is_active">
                      <template #label>Active</template>
                  </USwitch>
                </UFormField>
              </div>
            </div>

            <!-- Dynamic Configuration Fields -->
            <div v-if="currentProviderSchema" class="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 class="font-medium text-sm text-gray-700 dark:text-gray-300">Configuration</h4>
              
              <div v-for="(field, key) in currentProviderSchema.config_schema" :key="key">
                <!-- Special handling for Encryption -->
                <UFormField 
                  v-if="key === 'encryption'"
                  :label="field.label || formatLabel(String(key))" 
                  :required="field.required"
                >
                  <USelectMenu 
                    v-model="formData.config[key]" 
                    :options="encryptionOptions"
                    value-key="value"
                    option-attribute="label"
                    placeholder="Select encryption"
                  />
                </UFormField>

                <!-- Normal fields -->
                <UFormField 
                  v-else
                  :label="field.label || formatLabel(String(key))" 
                  :required="field.required"
                  :help="key === 'port' ? 'Common ports: 25 (None), 465 (SSL), 587 (TLS)' : ''"
                >
                  <UInput 
                    v-if="field.type === 'string' || !field.type"
                    v-model="formData.config[key]" 
                    :type="field.secret ? 'password' : 'text'"
                    :placeholder="formatLabel(String(key))"
                    :required="field.required"
                  />
                  <!-- SendPulse Warning -->
                  <div v-if="String(key) === 'from_email' && formData.provider === 'sendpulse_api'" class="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 mr-1" />
                    Must be a verified sender in SendPulse.
                  </div>
                  <UInput 
                    v-else-if="field.type === 'integer'"
                    v-model.number="formData.config[key]" 
                    type="number"
                    :placeholder="formatLabel(String(key))"
                    :required="field.required"
                  />
                   <div v-else-if="field.type === 'boolean'" class="flex items-center">
                     <USwitch v-model="formData.config[key]" />
                     <span class="ml-2 text-sm text-gray-500">{{ field.label || formatLabel(String(key)) }}</span>
                   </div>
                </UFormField>
              </div>
              
            <!-- Hint about missing fields -->
            <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
              If expected fields (like "From Email") are not visible, the provider schema from the backend may need updating.
            </div>
            </div>
            </form>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="isModalOpen = false">Cancel</UButton>
              <UButton type="submit" form="channel-form" :loading="isSubmitting">
                {{ editingChannel ? 'Update' : 'Create' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Test Modal -->
    <UModal v-model:open="isTestModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                 <DialogTitle class="font-semibold text-gray-900 dark:text-white">Test Channel</DialogTitle>
                 <DialogDescription class="text-sm text-gray-500">
                    Verify this channel by sending a test message.
                 </DialogDescription>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isTestModalOpen = false" />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="testChannel">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Send a test message via <strong>{{ testingChannel?.name }}</strong>
            </p>

            <UFormField :label="testingChannel?.channel_type === 'email' ? 'Recipient Email' : 'Recipient'" required>
              <UInput 
                v-model="testRecipient" 
                :type="testingChannel?.channel_type === 'email' ? 'email' : 'text'"
                :placeholder="testingChannel?.channel_type === 'email' ? 'test@example.com' : 'Recipient'"
                required
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" @click="isTestModalOpen = false">Cancel</UButton>
              <UButton type="submit" :loading="isTesting" color="success">
                <UIcon name="i-heroicons-paper-airplane" class="mr-1" />
                Send Test
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
