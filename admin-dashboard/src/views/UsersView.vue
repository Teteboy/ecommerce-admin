<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Users</h1>
            <p class="text-body-1 text-medium-emphasis">
              Manage system users and their permissions
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="createUser"
            :disabled="!authStore.hasPermission('super_admin')"
          >
            Add User
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters and Search -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          label="Search users"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          @input="debouncedSearch"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedRole"
          :items="roleOptions"
          label="Role"
          variant="outlined"
          clearable
          @update:model-value="filterUsers"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedStatus"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          clearable
          @update:model-value="filterUsers"
        ></v-select>
      </v-col>
    </v-row>

    <!-- Users Table -->
    <v-card class="dashboard-card">
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredUsers"
          :items-per-page="itemsPerPage"
          :loading="isLoading"
          density="compact"
          class="transparent-table"
          :sort-by="sortBy"
          :sort-desc="sortDesc"
          @update:options="handleSort"
        >
          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="40" class="mr-3">
                <v-img :src="item.avatar || '/default-avatar.png'" :alt="item.first_name"></v-img>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
              </div>
            </div>
          </template>

          <template v-slot:item.role="{ item }">
            <v-chip
              :color="getRoleColor(item.role)"
              size="small"
              variant="flat"
            >
              {{ item.role }}
            </v-chip>
          </template>

          <template v-slot:item.last_login="{ item }">
            <span>{{ item.last_login ? formatDate(item.last_login) : 'Never' }}</span>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.is_active ? 'success' : 'error'"
              size="small"
              variant="flat"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <template v-slot:item.created_at="{ item }">
            {{ formatDate(item.created_at) }}
          </template>

          <template v-slot:item.actions="{ item }">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon size="small" variant="text" v-bind="props">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="viewUser(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>View Details</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="editUser(item)"
                  :disabled="!authStore.hasPermission('super_admin')"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item @click="resetPassword(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-lock-reset</v-icon>
                  </template>
                  <v-list-item-title>Reset Password</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  @click="toggleStatus(item)"
                  :disabled="!authStore.hasPermission('super_admin')"
                >
                  <template v-slot:prepend>
                    <v-icon>{{ item.is_active ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ item.is_active ? 'Deactivate' : 'Activate' }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="deleteUser(item)"
                  :disabled="!authStore.hasPermission('super_admin')"
                  class="error--text"
                >
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit User Dialog -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6">
          {{ isEditing ? 'Edit User' : 'Create New User' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.first_name"
                  label="First Name"
                  variant="outlined"
                  :rules="nameRules"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.last_name"
                  label="Last Name"
                  variant="outlined"
                  :rules="nameRules"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="userForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  :rules="emailRules"
                  required
                  :disabled="isEditing"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="userForm.role"
                  :items="roleOptions"
                  label="Role"
                  variant="outlined"
                  :rules="roleRules"
                  required
                  :disabled="!authStore.hasPermission('super_admin')"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="userForm.status"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                  :rules="statusRules"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" v-if="!isEditing">
                <v-text-field
                  v-model="userForm.password"
                  label="Password"
                  type="password"
                  variant="outlined"
                  :rules="passwordRules"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="userDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="text" @click="saveUser" :loading="isSaving">
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete User</v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ selectedUser?.first_name }} {{ selectedUser?.last_name }}?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="text" @click="confirmDelete" :loading="isDeleting">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'

const authStore = useAuthStore()

const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const itemsPerPage = ref(10)
const sortBy = ref(['created_at'])
const sortDesc = ref([true])
const userDialog = ref(false)
const deleteDialog = ref(false)
const selectedUser = ref<any>(null)
const isEditing = ref(false)
const valid = ref(false)

const users = ref<any[]>([])
const userForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'manager',
  status: true
})

const roleOptions = ref([
  { title: 'Super Admin', value: 'super_admin' },
  { title: 'Admin', value: 'admin' },
  { title: 'Manager', value: 'manager' }
])

const statusOptions = ref([
  { title: 'Active', value: true },
  { title: 'Inactive', value: false }
])

const headers = [
  { title: 'User', key: 'name', width: '250px' },
  { title: 'Role', key: 'role', width: '120px' },
  { title: 'Last Login', key: 'last_login', width: '150px' },
  { title: 'Status', key: 'status', width: '100px' },
  { title: 'Created', key: 'created_at', width: '120px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
]

const filteredUsers = computed(() => {
  let filtered = users.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }

  if (selectedRole.value) {
    filtered = filtered.filter(user => user.role === selectedRole.value)
  }

  if (selectedStatus.value !== '') {
    filtered = filtered.filter(user => user.is_active === selectedStatus.value)
  }

  return filtered
})

const nameRules = [
  (v: string) => !!v || 'This field is required',
  (v: string) => v.length >= 2 || 'Must be at least 2 characters'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const roleRules = [
  (v: string) => !!v || 'Role is required',
  (v: string) => ['super_admin', 'admin', 'manager'].includes(v) || 'Invalid role selected'
]

const statusRules = [
  (v: boolean) => v !== undefined || 'Status is required'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters',
  (v: string) => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v) || 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
]

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    'super_admin': 'error',
    'admin': 'warning',
    'manager': 'primary'
  }
  return colors[role] || 'grey'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const debouncedSearch = (() => {
  let timeout: number
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterUsers()
    }, 300)
  }
})()

const filterUsers = () => {
  // Trigger computed property recalculation
}

const handleSort = (options: any) => {
  if (options && options.sortBy && options.sortBy.length > 0) {
    sortBy.value = [options.sortBy[0]]
    sortDesc.value = [options.sortDesc && options.sortDesc[0]]
  }
}

const createUser = () => {
  isEditing.value = false
  Object.assign(userForm, {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'manager',
    status: true
  })
  userDialog.value = true
}

const editUser = (user: any) => {
  isEditing.value = true
  Object.assign(userForm, {
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    password: '',
    role: user.role,
    status: user.is_active
  })
  selectedUser.value = user
  userDialog.value = true
}

const viewUser = (user: any): void => {
  // Navigate to user detail page
  console.log('View user:', user.id)
  // TODO: Implement user detail view
}

const resetPassword = async (user: any): Promise<void> => {
  try {
    const newPassword = prompt('Enter new password for user (minimum 8 characters):')
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/users/${user.id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ newPassword })
    })

    const data = await response.json()

    if (data.success) {
      alert('Password reset successfully')
    } else {
      alert('Failed to reset password: ' + (data.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Failed to reset password:', error)
    alert('Failed to reset password')
  }
}

const toggleStatus = async (user: any): Promise<void> => {
  try {
    const newStatus = !user.is_active
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ isActive: newStatus })
    })
    const data = await response.json()

    if (data.success) {
      user.is_active = newStatus
    }
  } catch (error) {
    console.error('Failed to toggle user status:', error)
  }
}

const deleteUser = (user: any) => {
  selectedUser.value = user
  deleteDialog.value = true
}

const confirmDelete = async (): Promise<void> => {
  if (!selectedUser.value) return

  try {
    isDeleting.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/users/${selectedUser.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      deleteDialog.value = false
      selectedUser.value = null
      await loadUsers()
    }
  } catch (error) {
    console.error('Failed to delete user:', error)
  } finally {
    isDeleting.value = false
  }
}

const saveUser = async (): Promise<void> => {
  try {
    isSaving.value = true
    const token = localStorage.getItem('auth_token')
    const url = isEditing.value ? `/api/users/${selectedUser.value.id}` : '/api/users'
    const method = isEditing.value ? 'PUT' : 'POST'

    // Prepare data for submission
    const submitData: any = { ...userForm }
    if (isEditing.value) {
      // Remove password field for updates if empty
      if (!submitData.password) {
        delete submitData.password
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(submitData)
    })

    const data = await response.json()

    if (data.success) {
      userDialog.value = false
      await loadUsers()
    } else {
      alert('Failed to save user: ' + (data.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Failed to save user:', error)
    alert('Failed to save user')
  } finally {
    isSaving.value = false
  }
}

const loadUsers = async (): Promise<void> => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/users', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      users.value = data.data.users || []
    }
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.transparent-table :deep(.v-data-table__td),
.transparent-table :deep(.v-data-table__th) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
}

.transparent-table :deep(.v-data-table__tbody tr:hover) {
  background: rgba(59, 130, 246, 0.05) !important;
}
</style>