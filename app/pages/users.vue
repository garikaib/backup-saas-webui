<script setup lang="ts">
import type { UserResponse, UserCreate, UserUpdate, VerifyEmailResponse } from '~/types/user'

definePageMeta({
  layout: 'dashboard'
})

const columns = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'full_name', accessorKey: 'full_name', header: 'Name' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'is_verified', accessorKey: 'is_verified', header: 'Verified' },
  { id: 'is_active', accessorKey: 'is_active', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const client = useApiClient()
const toast = useToast()
const dialog = useDialog()
const authStore = useAuthStore()

// Fetch current user
const { data: currentUser } = await useAsyncData('current-user', () => 
  client<UserResponse>('/users/me')
)

// Fetch users
const { data: usersData, refresh, status } = await useAsyncData('users-list', () => 
  client<{ users: UserResponse[], total: number }>('/users/')
)

const users = computed(() => usersData.value?.users || [])

// Count super admins for protection
const superAdminCount = computed(() => 
  users.value.filter(u => u.role === 'super_admin').length
)

// Check if user can be deleted
function canDeleteUser(user: UserResponse): boolean {
  // Can't delete yourself
  if (currentUser.value && user.id === currentUser.value.id) {
    return false
  }
  // Can't delete last super admin
  if (user.role === 'super_admin' && superAdminCount.value <= 1) {
    return false
  }
  return true
}

// Get tooltip for disabled delete button
function getDeleteTooltip(user: UserResponse): string | undefined {
  if (currentUser.value && user.id === currentUser.value.id) {
    return 'You cannot delete yourself'
  }
  if (user.role === 'super_admin' && superAdminCount.value <= 1) {
    return 'Cannot delete the last super admin'
  }
  return undefined
}

// Modal state
const isModalOpen = ref(false)
const editingUser = ref<UserResponse | null>(null)
const isSubmitting = ref(false)

// Verification modal state
const isVerifyModalOpen = ref(false)
const verifyingUser = ref<UserResponse | null>(null)
const verificationCode = ref('')
const isVerifying = ref(false)

// Assignments modal state
const isAssignmentsModalOpen = ref(false)
const assigningUser = ref<UserResponse | null>(null)

function openAssignmentsModal(user: UserResponse) {
  assigningUser.value = user
  isAssignmentsModalOpen.value = true
}

// Check if user can have assignments (only node_admin/site_admin)
function canHaveAssignments(user: UserResponse): boolean {
  return user.role === 'node_admin' || user.role === 'site_admin'
}

// Form state
const formData = reactive<UserCreate & { id?: number }>({
  email: '',
  password: '',
  full_name: '',
  is_active: true,
  role: 'site_admin'
})

const roleOptions = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Node Admin', value: 'node_admin' },
  { label: 'Site Admin', value: 'site_admin' }
]

// Check if user is editing themselves (can't change own role)
const isEditingSelf = computed(() => 
  editingUser.value && currentUser.value && editingUser.value.id === currentUser.value.id
)

// For inline node assignment during user creation
const allNodes = ref<Array<{ id: number; hostname: string; ip_address: string }>>([]) 
const selectedNodeIds = ref<number[]>([])
const loadingNodes = ref(false)

// Show assignment section when creating non-super_admin
const showAssignmentSection = computed(() => 
  !editingUser.value && formData.role !== 'super_admin'
)

// Fetch nodes when creating a user that needs assignments
async function fetchNodesForAssignment() {
  if (allNodes.value.length > 0) return
  loadingNodes.value = true
  try {
    allNodes.value = await client<Array<{ id: number; hostname: string; ip_address: string }>>('/nodes/')
  } catch {
    allNodes.value = []
  } finally {
    loadingNodes.value = false
  }
}

function openCreateModal() {
  editingUser.value = null
  selectedNodeIds.value = []
  Object.assign(formData, {
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    role: 'site_admin'
  })
  fetchNodesForAssignment()
  isModalOpen.value = true
}

function openEditModal(user: UserResponse) {
  editingUser.value = user
  Object.assign(formData, {
    id: user.id,
    email: user.email,
    password: '',
    full_name: user.full_name || '',
    is_active: user.is_active,
    role: user.role
  })
  isModalOpen.value = true
}

async function submitForm() {
  isSubmitting.value = true
  try {
    if (editingUser.value) {
      // Update existing user - don't send role if editing self
      const updateData: UserUpdate = {
        email: formData.email,
        full_name: formData.full_name,
        is_active: formData.is_active,
      }
      // Only include role if not editing self
      if (!isEditingSelf.value) {
        updateData.role = formData.role
      }
      if (formData.password) {
        updateData.password = formData.password
      }
      await client(`/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: updateData
      })
      toast.add({ title: 'Success', description: 'User updated successfully.', color: 'success' })
    } else {
      // Create new user
      const newUser = await client<{ id: number }>('/users/', {
        method: 'POST',
        body: formData
      })
      
      // Assign nodes if selected and role is appropriate
      if (selectedNodeIds.value.length > 0 && formData.role !== 'super_admin') {
        try {
          await client(`/users/${newUser.id}/nodes`, {
            method: 'POST',
            body: { node_ids: selectedNodeIds.value }
          })
        } catch (e) {
          // User was created but assignment failed
          toast.add({ title: 'Warning', description: 'User created but node assignment failed.', color: 'warning' })
        }
      }
      
      toast.add({ title: 'Success', description: 'User created successfully. Verification email sent.', color: 'success' })
    }
    isModalOpen.value = false
    refresh()
  } catch (error: any) {
    const message = error?.data?.detail || 'An error occurred'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function deleteUser(user: UserResponse) {
  const confirmed = await dialog.confirm({
    title: 'Delete User',
    message: `Are you sure you want to delete "${user.email}"? This action cannot be undone.`,
    variant: 'danger',
    confirmLabel: 'Delete'
  })
  if (!confirmed) return
  
  try {
    await client(`/users/${user.id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'User deleted successfully.', color: 'success' })
    refresh()
  } catch (error: any) {
    const message = error?.data?.detail || 'Failed to delete user'
    toast.add({ title: 'Error', description: message, color: 'error' })
  }
}

// Verification functions
function openVerifyModal(user: UserResponse) {
  verifyingUser.value = user
  verificationCode.value = ''
  isVerifyModalOpen.value = true
}

async function verifyEmail() {
  if (!verifyingUser.value || !verificationCode.value) return
  
  isVerifying.value = true
  try {
    await client<VerifyEmailResponse>(`/users/${verifyingUser.value.id}/verify-email`, {
      method: 'POST',
      body: { code: verificationCode.value }
    })
    toast.add({ title: 'Success', description: 'Email verified successfully.', color: 'success' })
    isVerifyModalOpen.value = false
    refresh()
  } catch (error: any) {
    const message = error?.data?.detail || 'Invalid verification code'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    isVerifying.value = false
  }
}

async function resendVerification(user: UserResponse) {
  try {
    await client(`/users/${user.id}/resend-verification`, {
      method: 'POST'
    })
    toast.add({ title: 'Success', description: 'Verification email sent.', color: 'success' })
  } catch (error: any) {
    const message = error?.data?.detail || 'Failed to send verification email'
    toast.add({ title: 'Error', description: message, color: 'error' })
  }
}

async function forceVerify(user: UserResponse) {
  const confirmed = await dialog.confirm({
    title: 'Force Verify User',
    message: `Are you sure you want to force verify "${user.email}"? This bypasses the normal verification process.`,
    variant: 'warning',
    confirmLabel: 'Force Verify'
  })
  if (!confirmed) return

  try {
    await client<VerifyEmailResponse>(`/users/${user.id}/force-verify`, {
      method: 'POST',
      body: { code: '', force_verify: true }
    })
    toast.add({ title: 'Success', description: 'User verified successfully.', color: 'success' })
    refresh()
  } catch (error: any) {
    const message = error?.data?.detail || 'Failed to verify user'
    toast.add({ title: 'Error', description: message, color: 'error' })
  }
}

function getRoleBadgeColor(role: string): 'primary' | 'success' | 'neutral' {
  const colors: Record<string, 'primary' | 'success' | 'neutral'> = {
    super_admin: 'primary',
    node_admin: 'success',
    site_admin: 'neutral'
  }
  return colors[role] || 'neutral'
}

function formatRole(role: string): string {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" @click="() => refresh()" />
        <UButton v-if="authStore.isSuperAdmin" icon="i-heroicons-plus" label="Add User" @click="openCreateModal" />
      </div>
    </div>

    <UCard>
      <UTable :data="users" :columns="columns" :loading="status === 'pending'">
        <template #full_name-cell="{ row }">
          <span>{{ row.original.full_name || '—' }}</span>
        </template>
        
        <template #role-cell="{ row }">
          <UBadge :color="getRoleBadgeColor(row.original.role)" variant="subtle">
            {{ formatRole(row.original.role) }}
          </UBadge>
        </template>

        <template #is_verified-cell="{ row }">
          <div class="flex items-center gap-2">
            <UBadge :color="row.original.is_verified ? 'success' : 'warning'" variant="subtle">
              {{ row.original.is_verified ? 'Verified' : 'Pending' }}
            </UBadge>
            <!-- Show pending email if exists -->
            <UTooltip v-if="row.original.pending_email" :text="`Pending: ${row.original.pending_email}`">
              <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-amber-500" />
            </UTooltip>
          </div>
        </template>
        
        <template #is_active-cell="{ row }">
          <UBadge :color="row.original.is_active ? 'success' : 'error'" variant="subtle">
            {{ row.original.is_active ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>
        
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <!-- Edit -->
            <UButton 
              size="xs" 
              color="neutral" 
              variant="ghost" 
              icon="i-heroicons-pencil"
              @click="openEditModal(row.original)" 
            />
            
            <!-- Verification actions for unverified users -->
            <template v-if="!row.original.is_verified">
              <UTooltip text="Verify with code">
                <UButton 
                  size="xs" 
                  color="success" 
                  variant="ghost" 
                  icon="i-heroicons-check-badge"
                  @click="openVerifyModal(row.original)"
                />
              </UTooltip>
              <UTooltip text="Resend verification">
                <UButton 
                  size="xs" 
                  color="neutral" 
                  variant="ghost" 
                  icon="i-heroicons-envelope"
                  @click="resendVerification(row.original)"
                />
              </UTooltip>
              <!-- Force verify for super admins only -->
              <UTooltip v-if="authStore.isSuperAdmin" text="Force verify">
                <UButton 
                  size="xs" 
                  color="warning" 
                  variant="ghost" 
                  icon="i-heroicons-shield-check"
                  @click="forceVerify(row.original)"
                />
              </UTooltip>
            </template>
            
            <!-- Node Assignments for node_admin/site_admin -->
            <UTooltip v-if="canHaveAssignments(row.original) && authStore.isSuperAdmin" text="Manage node assignments">
              <UButton 
                size="xs" 
                color="primary" 
                variant="ghost" 
                icon="i-heroicons-server-stack"
                @click="openAssignmentsModal(row.original)"
              />
            </UTooltip>
            
            <!-- Delete -->
            <UTooltip v-if="!canDeleteUser(row.original)" :text="getDeleteTooltip(row.original) || ''">
              <UButton 
                size="xs" 
                color="error" 
                variant="ghost" 
                icon="i-heroicons-trash"
                disabled
              />
            </UTooltip>
            <UButton 
              v-else
              size="xs" 
              color="error" 
              variant="ghost" 
              icon="i-heroicons-trash"
              @click="deleteUser(row.original)" 
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- User Form Modal -->
    <UModal 
      v-model:open="isModalOpen"
      :title="editingUser ? 'Edit User' : 'Create User'"
      :description="editingUser ? 'Update user account details' : 'Create a new user account'"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ editingUser ? 'Edit User' : 'Create User' }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="isModalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="submitForm">
            <UFormField label="Email" required>
              <UInput 
                v-model="formData.email" 
                type="email" 
                placeholder="user@example.com"
                required
              />
            </UFormField>

            <UFormField label="Full Name">
              <UInput 
                v-model="formData.full_name" 
                placeholder="John Doe"
              />
            </UFormField>

            <UFormField :label="editingUser ? 'New Password (leave blank to keep current)' : 'Password'" :required="!editingUser">
              <UInput 
                v-model="formData.password" 
                type="password" 
                placeholder="••••••••"
                :required="!editingUser"
              />
            </UFormField>

            <!-- Role - hidden when editing self -->
            <UFormField v-if="!isEditingSelf" label="Role" required>
              <USelectMenu 
                v-model="formData.role" 
                :items="roleOptions"
                value-key="value"
              />
            </UFormField>
            
            <!-- Info message when editing self -->
            <div v-if="isEditingSelf" class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 inline mr-1" />
              You cannot change your own role.
            </div>

            <UFormField label="Status">
              <USwitch v-model="formData.is_active">
                <template #label>
                  {{ formData.is_active ? 'Active' : 'Inactive' }}
                </template>
              </USwitch>
            </UFormField>

            <!-- Node Assignment Section for new node_admin/site_admin users -->
            <div v-if="showAssignmentSection" class="border-t pt-4 mt-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Nodes (optional)
              </h4>
              <div v-if="loadingNodes" class="flex justify-center py-2">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
              </div>
              <USelectMenu
                v-else
                v-model="selectedNodeIds"
                :items="allNodes.map(n => ({ label: `${n.hostname} (${n.ip_address})`, value: n.id }))"
                multiple
                placeholder="Select nodes to assign..."
                value-key="value"
              />
              <p class="text-xs text-gray-500 mt-1">You can also assign nodes later from the user list.</p>
            </div>

            <!-- Note about verification for new users -->
            <div v-if="!editingUser" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
              New users will receive a verification email with a 6-character code.
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" @click="isModalOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isSubmitting">
                {{ editingUser ? 'Update User' : 'Create User' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Verification Modal -->
    <UModal 
      v-model:open="isVerifyModalOpen"
      title="Verify Email"
      description="Enter the verification code sent to user's email"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-white">Verify Email</h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="isVerifyModalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="verifyEmail">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Enter the 6-character verification code sent to 
              <strong>{{ verifyingUser?.email }}</strong>
            </p>

            <UFormField label="Verification Code" required>
              <UInput 
                v-model="verificationCode" 
                placeholder="A3X9K2"
                class="font-mono text-lg tracking-widest text-center"
                maxlength="6"
                required
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="neutral" variant="ghost" @click="isVerifyModalOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isVerifying" :disabled="verificationCode.length < 6">
                Verify
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Node Assignments Modal -->
    <UserAssignmentsModal
      v-if="assigningUser"
      v-model:open="isAssignmentsModalOpen"
      :user="assigningUser"
      @updated="refresh()"
    />
  </div>
</template>

