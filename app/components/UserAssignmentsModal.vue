<script setup lang="ts">
import type { NodeAssignment, SiteAssignment, UserResponse, AssignmentResponse } from '~/types/user'
import { DialogTitle, DialogDescription } from 'reka-ui'

const props = defineProps<{
  user: UserResponse
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const client = useApiClient()
const toast = useToast()

// Determine assignment type based on user role
const assignmentType = computed(() => {
  if (props.user.role === 'node_admin') return 'nodes'
  if (props.user.role === 'site_admin') return 'sites'
  return null
})

// Loading states
const loadingAssigned = ref(false)
const loadingAll = ref(false)
const saving = ref(false)
const removing = ref<number | null>(null)

// Node data
const assignedNodes = ref<NodeAssignment[]>([])
const allNodes = ref<NodeAssignment[]>([])
const selectedNodeIds = ref<number[]>([])

// Site data
const assignedSites = ref<SiteAssignment[]>([])
const allSites = ref<SiteAssignment[]>([])
const selectedSiteIds = ref<number[]>([])

// Available items (not already assigned)
const availableNodes = computed(() => {
  const assignedIds = new Set(assignedNodes.value.map(n => n.id))
  return allNodes.value.filter(n => !assignedIds.has(n.id))
})

const availableSites = computed(() => {
  const assignedIds = new Set(assignedSites.value.map(s => s.id))
  return allSites.value.filter(s => !assignedIds.has(s.id))
})

// Fetch functions
async function fetchAssignedNodes() {
  loadingAssigned.value = true
  try {
    assignedNodes.value = await client<NodeAssignment[]>(`/users/${props.user.id}/nodes`)
  } catch {
    assignedNodes.value = []
  } finally {
    loadingAssigned.value = false
  }
}

async function fetchAllNodes() {
  loadingAll.value = true
  try {
    allNodes.value = await client<NodeAssignment[]>('/nodes/')
  } catch {
    allNodes.value = []
  } finally {
    loadingAll.value = false
  }
}

async function fetchAssignedSites() {
  loadingAssigned.value = true
  try {
    assignedSites.value = await client<SiteAssignment[]>(`/users/${props.user.id}/sites`)
  } catch {
    assignedSites.value = []
  } finally {
    loadingAssigned.value = false
  }
}

async function fetchAllSites() {
  loadingAll.value = true
  try {
    const response = await client<{ sites: SiteAssignment[] }>('/sites/')
    allSites.value = response.sites || []
  } catch {
    allSites.value = []
  } finally {
    loadingAll.value = false
  }
}

// Assign functions
async function assignNodes() {
  if (selectedNodeIds.value.length === 0) return
  
  saving.value = true
  try {
    await client<AssignmentResponse>(`/users/${props.user.id}/nodes`, {
      method: 'POST',
      body: { node_ids: selectedNodeIds.value }
    })
    toast.add({ title: 'Success', description: 'Nodes assigned.', color: 'success' })
    selectedNodeIds.value = []
    await fetchAssignedNodes()
    emit('updated')
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to assign nodes', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function assignSites() {
  if (selectedSiteIds.value.length === 0) return
  
  saving.value = true
  try {
    await client<AssignmentResponse>(`/users/${props.user.id}/sites`, {
      method: 'POST',
      body: { site_ids: selectedSiteIds.value }
    })
    toast.add({ title: 'Success', description: 'Sites assigned.', color: 'success' })
    selectedSiteIds.value = []
    await fetchAssignedSites()
    emit('updated')
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to assign sites', color: 'error' })
  } finally {
    saving.value = false
  }
}

// Remove functions
async function removeNode(nodeId: number) {
  removing.value = nodeId
  try {
    await client(`/users/${props.user.id}/nodes/${nodeId}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Node removed.', color: 'success' })
    await fetchAssignedNodes()
    emit('updated')
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to remove node', color: 'error' })
  } finally {
    removing.value = null
  }
}

async function removeSite(siteId: number) {
  removing.value = siteId
  try {
    await client(`/users/${props.user.id}/sites/${siteId}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Site removed.', color: 'success' })
    await fetchAssignedSites()
    emit('updated')
  } catch (error: any) {
    toast.add({ title: 'Error', description: error?.data?.detail || 'Failed to remove site', color: 'error' })
  } finally {
    removing.value = null
  }
}

// Watch for modal open
watch(isOpen, async (open) => {
  if (open) {
    if (assignmentType.value === 'nodes') {
      await Promise.all([fetchAssignedNodes(), fetchAllNodes()])
    } else if (assignmentType.value === 'sites') {
      await Promise.all([fetchAssignedSites(), fetchAllSites()])
    }
  }
})

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    blocked: 'error'
  }
  return colors[status] || 'neutral'
}
</script>

<template>
  <UModal 
    v-model:open="isOpen"
    :title="assignmentType === 'nodes' ? 'Manage Node Assignments' : 'Manage Site Assignments'"
    :description="`Assign or remove ${assignmentType} for ${user.email}`"
  >
    <template #content>
      <UCard class="min-w-[500px]">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <DialogTitle as="h3" class="font-semibold text-gray-900 dark:text-white">
                {{ assignmentType === 'nodes' ? 'Manage Node Assignments' : 'Manage Site Assignments' }}
              </DialogTitle>
              <DialogDescription as="p" class="text-sm text-gray-500">
                {{ user.email }} ({{ user.role.replace('_', ' ') }})
              </DialogDescription>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- Unsupported role message -->
        <div v-if="!assignmentType" class="text-center py-8 text-gray-500">
          <UIcon name="i-heroicons-shield-exclamation" class="w-12 h-12 mx-auto mb-2" />
          <p>Super Admins have access to all resources.</p>
          <p class="text-sm">No assignments needed.</p>
        </div>

        <!-- Node Assignments -->
        <div v-else-if="assignmentType === 'nodes'" class="space-y-6">
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Nodes ({{ assignedNodes.length }})
            </h4>
            
            <div v-if="loadingAssigned" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
            </div>
            
            <div v-else-if="assignedNodes.length === 0" class="text-sm text-gray-500 py-4 text-center border border-dashed rounded-lg">
              No nodes assigned yet
            </div>
            
            <div v-else class="space-y-2 max-h-48 overflow-y-auto">
              <div 
                v-for="node in assignedNodes" 
                :key="node.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <UIcon name="i-heroicons-server" class="w-5 h-5 text-gray-400" />
                  <div>
                    <p class="font-medium text-sm">{{ node.hostname }}</p>
                    <p class="text-xs text-gray-500">{{ node.ip_address }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge :color="getStatusColor(node.status)" size="xs">{{ node.status }}</UBadge>
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    :loading="removing === node.id"
                    @click="removeNode(node.id)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="availableNodes.length > 0" class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Nodes</h4>
            <div class="flex gap-2">
              <USelectMenu
                v-model="selectedNodeIds"
                :items="availableNodes.map(n => ({ label: `${n.hostname} (${n.ip_address})`, value: n.id }))"
                multiple
                placeholder="Select nodes..."
                class="flex-1"
                value-key="value"
              />
              <UButton
                icon="i-heroicons-plus"
                :loading="saving"
                :disabled="selectedNodeIds.length === 0"
                @click="assignNodes"
              >
                Assign
              </UButton>
            </div>
          </div>
        </div>

        <!-- Site Assignments -->
        <div v-else-if="assignmentType === 'sites'" class="space-y-6">
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Sites ({{ assignedSites.length }})
            </h4>
            
            <div v-if="loadingAssigned" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
            </div>
            
            <div v-else-if="assignedSites.length === 0" class="text-sm text-gray-500 py-4 text-center border border-dashed rounded-lg">
              No sites assigned yet
            </div>
            
            <div v-else class="space-y-2 max-h-48 overflow-y-auto">
              <div 
                v-for="site in assignedSites" 
                :key="site.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-gray-400" />
                  <div>
                    <p class="font-medium text-sm">{{ site.name }}</p>
                    <p class="text-xs text-gray-500">Node ID: {{ site.node_id }}</p>
                  </div>
                </div>
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  :loading="removing === site.id"
                  @click="removeSite(site.id)"
                />
              </div>
            </div>
          </div>

          <div v-if="availableSites.length > 0" class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Sites</h4>
            <div class="flex gap-2">
              <USelectMenu
                v-model="selectedSiteIds"
                :items="availableSites.map(s => ({ label: s.name, value: s.id }))"
                multiple
                placeholder="Select sites..."
                class="flex-1"
                value-key="value"
              />
              <UButton
                icon="i-heroicons-plus"
                :loading="saving"
                :disabled="selectedSiteIds.length === 0"
                @click="assignSites"
              >
                Assign
              </UButton>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="neutral" variant="ghost" @click="isOpen = false">
              Close
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
