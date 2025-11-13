<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Customers</h1>
            <p class="text-body-1 text-medium-emphasis">
              Manage your customer database and relationships
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="createCustomer"
            :disabled="!authStore.hasPermission('admin')"
          >
            Add Customer
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters and Search -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          label="Search customers"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          @input="debouncedSearch"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedSegment"
          :items="customerSegments"
          label="Customer Segment"
          variant="outlined"
          clearable
          @update:model-value="filterCustomers"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedStatus"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          clearable
          @update:model-value="filterCustomers"
        ></v-select>
      </v-col>
    </v-row>

    <!-- Customer Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-primary pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-account-group</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.total }}
              </div>
              <div class="text-caption white--text opacity-8">Total Customers</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-success pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-account-plus</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.newThisMonth }}
              </div>
              <div class="text-caption white--text opacity-8">New This Month</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-warning pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-star</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.active }}
              </div>
              <div class="text-caption white--text opacity-8">Active Customers</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-info pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-trending-up</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                €{{ stats.averageValue.toFixed(0) }}
              </div>
              <div class="text-caption white--text opacity-8">Avg. Order Value</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Customers Table -->
    <v-card class="dashboard-card">
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredCustomers"
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

          <template v-slot:item.segment="{ item }">
            <v-chip
              :color="getSegmentColor(item.segment)"
              size="small"
              variant="flat"
            >
              {{ item.segment }}
            </v-chip>
          </template>

          <template v-slot:item.total_orders="{ item }">
            <span class="font-weight-medium">{{ item.total_orders }}</span>
          </template>

          <template v-slot:item.total_spent="{ item }">
            <span class="font-weight-medium">€{{ item.total_spent.toFixed(2) }}</span>
          </template>

          <template v-slot:item.last_order="{ item }">
            <span>{{ item.last_order ? formatDate(item.last_order) : 'Never' }}</span>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.status === 'active' ? 'success' : 'error'"
              size="small"
              variant="flat"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon size="small" variant="text" v-bind="props">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="$router.push(`/customers/${item.id}`)">
                  <template v-slot:prepend>
                    <v-icon>mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>View Details</v-list-item-title>
                </v-list-item>
                <v-list-item @click="editCustomer(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item @click="sendEmail(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-email</v-icon>
                  </template>
                  <v-list-item-title>Send Email</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  @click="toggleStatus(item)"
                  :disabled="!authStore.hasPermission('admin')"
                >
                  <template v-slot:prepend>
                    <v-icon>{{ item.status === 'active' ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ item.status === 'active' ? 'Deactivate' : 'Activate' }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="deleteCustomer(item)"
                  :disabled="!authStore.hasPermission('admin')"
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

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Customer</v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ selectedCustomer?.first_name }} {{ selectedCustomer?.last_name }}?
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
const isDeleting = ref(false)
const searchQuery = ref('')
const selectedSegment = ref('')
const selectedStatus = ref('')
const itemsPerPage = ref(10)
const sortBy = ref([{ key: 'created_at', order: 'desc' }])
const sortDesc = ref([true])
const deleteDialog = ref(false)
const selectedCustomer = ref<any>(null)

const customers = ref<any[]>([])
const stats = reactive({
  total: 0,
  newThisMonth: 0,
  active: 0,
  averageValue: 0
})

const customerSegments = ref([
  'VIP',
  'Regular',
  'New',
  'Inactive'
])

const statusOptions = ref([
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
])

const headers = [
  { title: 'Customer', key: 'name', width: '250px' },
  { title: 'Segment', key: 'segment', width: '120px' },
  { title: 'Orders', key: 'total_orders', width: '100px' },
  { title: 'Total Spent', key: 'total_spent', width: '120px' },
  { title: 'Last Order', key: 'last_order', width: '120px' },
  { title: 'Status', key: 'status', width: '100px' },
  { title: 'Joined', key: 'created_at', width: '120px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
]

const filteredCustomers = computed(() => {
  let filtered = customers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(customer =>
      customer.first_name.toLowerCase().includes(query) ||
      customer.last_name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query)
    )
  }

  if (selectedSegment.value) {
    filtered = filtered.filter(customer => customer.segment === selectedSegment.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(customer => customer.status === selectedStatus.value)
  }

  return filtered
})

const getSegmentColor = (segment: string) => {
  const colors: Record<string, string> = {
    'VIP': 'warning',
    'Regular': 'primary',
    'New': 'success',
    'Inactive': 'grey'
  }
  return colors[segment] || 'grey'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const debouncedSearch = (() => {
  let timeout: NodeJS.Timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterCustomers()
    }, 300)
  }
})()

const filterCustomers = () => {
  // Trigger computed property recalculation
}

const handleSort = (options: any) => {
  sortBy.value = options.sortBy
  sortDesc.value = options.sortDesc
}

const createCustomer = () => {
  // Navigate to customer creation page or open modal
  console.log('Create new customer')
}

const editCustomer = (customer: any) => {
  // Navigate to customer edit page
  console.log('Edit customer:', customer.id)
}

const sendEmail = (customer: any) => {
  // Open email composer or send email
  console.log('Send email to customer:', customer.id)
}

const toggleStatus = async (customer: any): Promise<void> => {
  try {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active'
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await response.json()

    if (data.success) {
      customer.status = newStatus
    }
  } catch (error) {
    console.error('Failed to toggle customer status:', error)
  }
}

const deleteCustomer = (customer: any) => {
  selectedCustomer.value = customer
  deleteDialog.value = true
}

const confirmDelete = async (): Promise<void> => {
  if (!selectedCustomer.value) return

  try {
    isDeleting.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/customers/${selectedCustomer.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      deleteDialog.value = false
      selectedCustomer.value = null
      await loadCustomers()
    }
  } catch (error) {
    console.error('Failed to delete customer:', error)
  } finally {
    isDeleting.value = false
  }
}

const loadCustomers = async (): Promise<void> => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/customers', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      customers.value = data.data.customers
      Object.assign(stats, data.data.stats)
    }
  } catch (error) {
    console.error('Failed to load customers:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadCustomers()
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