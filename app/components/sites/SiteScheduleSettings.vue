<script setup lang="ts">
import type { Site } from '~/types/site'
import { DialogTitle, DialogDescription } from 'reka-ui'

const props = defineProps<{
  siteId: number
  siteName: string
  // Initial values
  initialFrequency?: 'manual' | 'daily' | 'weekly' | 'monthly'
  initialTime?: string
  initialDays?: string
  initialRetention?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const client = useApiClient()
const toast = useToast()

// Form State
const frequency = ref<'manual' | 'daily' | 'weekly' | 'monthly'>(props.initialFrequency || 'manual')
const time = ref(props.initialTime || '00:00')
const retention = ref(props.initialRetention || 7)
const loading = ref(false)

// Days State
const weeklyDays = ref<string[]>([]) // For checkbox group
const monthlyDay = ref<number>(1)   // For number input

// Initialize days from props
watchEffect(() => {
  if (props.initialDays) {
    if (props.initialFrequency === 'weekly') {
      weeklyDays.value = props.initialDays.split(',')
    } else if (props.initialFrequency === 'monthly') {
      const day = parseInt(props.initialDays.split(',')[0] || '1')
      monthlyDay.value = isNaN(day) ? 1 : day
    }
  }
})

// Options
const frequencyOptions = [
  { label: 'Manual (No Schedule)', value: 'manual' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
]

const dayOptions = [
  { label: 'Mon', value: '0' },
  { label: 'Tue', value: '1' },
  { label: 'Wed', value: '2' },
  { label: 'Thu', value: '3' },
  { label: 'Fri', value: '4' },
  { label: 'Sat', value: '5' },
  { label: 'Sun', value: '6' }
]

// Validation
const isValid = computed(() => {
  if (frequency.value === 'manual') return true
  if (frequency.value === 'weekly' && weeklyDays.value.length === 0) return false
  if (frequency.value === 'monthly' && (monthlyDay.value < 1 || monthlyDay.value > 31)) return false
  return true
})

async function saveSchedule() {
  loading.value = true
  try {
    let scheduleDays = ''
    
    if (frequency.value === 'weekly') {
      scheduleDays = weeklyDays.value.join(',')
    } else if (frequency.value === 'monthly') {
      scheduleDays = monthlyDay.value.toString()
    }

    const payload = {
      schedule_frequency: frequency.value,
      schedule_time: time.value,
      schedule_days: scheduleDays,
      retention_copies: retention.value
    }

    await client(`/sites/${props.siteId}/schedule`, {
      method: 'PUT',
      body: payload
    })

    toast.add({
      title: 'Schedule Updated',
      description: `Backup schedule for ${props.siteName} has been saved.`,
      color: 'success'
    })
    
    emit('saved')
    emit('close')
  } catch (error: any) {
    console.error('Failed to save schedule', error)
    toast.add({
      title: 'Save Failed',
      description: error?.data?.detail || error.message || 'Failed to update schedule',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <DialogTitle as="h3" class="text-lg font-semibold">Backup Schedule - {{ siteName }}</DialogTitle>
          <DialogDescription class="sr-only">Configure automated backup schedule frequencies and retention policies for this site.</DialogDescription>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="emit('close')" />
        </div>
      </template>

      <div class="space-y-6">
        <!-- Frequency -->
        <UFormField label="Backup Frequency" help="How often should backups run automatically?">
          <USelectMenu
            v-model="frequency"
            :items="frequencyOptions"
            value-key="value"
          />
        </UFormField>

        <template v-if="frequency !== 'manual'">
          <!-- Time -->
          <UFormField label="Time (Africa/Harare)" help="Schedule time in 24-hour format">
             <UInput type="time" v-model="time" />
          </UFormField>

          <!-- Weekly Days -->
          <UFormField v-if="frequency === 'weekly'" label="Days of Week" :error="weeklyDays.length === 0 && 'Select at least one day'">
             <div class="flex flex-wrap gap-4 mt-2">
               <UCheckbox 
                 v-for="day in dayOptions" 
                 :key="day.value"
                 :label="day.label"
                 :model-value="weeklyDays.includes(day.value)"
                 @update:model-value="(val) => {
                   if (val) weeklyDays.push(day.value)
                   else weeklyDays = weeklyDays.filter(d => d !== day.value)
                 }"
               />
             </div>
          </UFormField>

          <!-- Monthly Day -->
          <UFormField v-if="frequency === 'monthly'" label="Day of Month" help="Enter a day between 1 and 31">
            <UInput type="number" v-model="monthlyDay" min="1" max="31" />
          </UFormField>

          <hr class="border-gray-200 dark:border-gray-700" />
        </template>

        <!-- Retention -->
        <UFormField label="Retention Copies" help="Number of backups to keep before deleting oldest">
          <UInput type="number" v-model="retention" min="1" max="50" />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('close')" />
          <UButton 
            label="Save Schedule" 
            color="primary" 
            :loading="loading" 
            :disabled="!isValid"
            @click="saveSchedule" 
          />
        </div>
      </template>
    </UCard>
</template>
