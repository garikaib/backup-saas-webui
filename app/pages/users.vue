<script setup lang="ts">
import type { UserResponse, UserCreate, UserUpdate } from '~/types/user'

definePageMeta({
  layout: 'dashboard'
})

const columns = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'full_name', accessorKey: 'full_name', header: 'Name' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'is_active', accessorKey: 'is_active', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

const client = useApiClient()
const toast = useToast()
const dialog = useDialog()

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

function openCreateModal() {
  editingUser.value = null
  Object.assign(formData, {
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    role: 'site_admin'
  })
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
      // Update existing user
      const updateData: UserUpdate = {
        email: formData.email,
        full_name: formData.full_name,
        is_active: formData.is_active,
        role: formData.role
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
      await client('/users/', {
        method: 'POST',
        body: formData
      })
      toast.add({ title: 'Success', description: 'User created successfully.', color: 'success' })
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
        <UButton icon="i-heroicons-plus" label="Add User" @click="openCreateModal" />
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
        
        <template #is_active-cell="{ row }">
          <UBadge :color="row.original.is_active ? 'success' : 'error'" variant="subtle">
            {{ row.original.is_active ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>
        
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton 
              size="xs" 
              color="neutral" 
              variant="ghost" 
              icon="i-heroicons-pencil"
              @click="openEditModal(row.original)" 
            />
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
    <UModal v-model:open="isModalOpen">
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

            <UFormField label="Role" required>
              <USelectMenu 
                v-model="formData.role" 
                :items="roleOptions"
                value-key="value"
              />
            </UFormField>

            <UFormField label="Status">
              <USwitch v-model="formData.is_active">
                <template #label>
                  {{ formData.is_active ? 'Active' : 'Inactive' }}
                </template>
              </USwitch>
            </UFormField>

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
  </div>
</template>
