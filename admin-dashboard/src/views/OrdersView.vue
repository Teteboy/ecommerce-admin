<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Orders</h1>
            <p class="text-body-1 text-medium-emphasis">
              Manage customer orders and track fulfillment
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="createOrder"
            :disabled="!authStore.hasPermission('admin')"
          >
            New Order
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters and Search -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="searchQuery"
          label="Search orders"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          @input="debouncedSearch"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedStatus"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          clearable
          @update:model-value="filterOrders"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-menu
          v-model="dateMenu"
          :close-on-content-click="false"
          transition="scale-transition"
          offset-y
          min-width="auto"
        >
          <template v-slot:activator="{ props }">
            <v-text-field
              v-model="dateRangeText"
              label="Date range"
              prepend-inner-icon="mdi-calendar"
              variant="outlined"
              readonly
              v-bind="props"
            ></v-text-field>
          </template>
          <v-date-picker
            v-model="dates"
            range
            @update:model-value="handleDateChange"
          ></v-date-picker>
        </v-menu>
      </v-col>
      <v-col cols="12" md="2">
        <v-btn
          color="secondary"
          variant="outlined"
          block
          @click="clearFilters"
        >
          Clear Filters
        </v-btn>
      </v-col>
    </v-row>

    <!-- Orders Table -->
    <v-card class="dashboard-card">
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredOrders"
          :items-per-page="itemsPerPage"
          :loading="isLoading"
          density="compact"
          class="transparent-table"
          :sort-by="sortBy"
          :sort-desc="sortDesc"
          @update:options="handleSort"
        >
          <template v-slot:item.order_number="{ item }">
            <div class="font-weight-medium text-primary">
              #{{ item.order_number }}
            </div>
          </template>

          <template v-slot:item.customer_email="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.customer_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.customer_email }}</div>
            </div>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="getStatusColor(item.status)"
              size="small"
              variant="flat"
              @click="showStatusMenu(item)"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template v-slot:item.total="{ item }">
            <span class="font-weight-medium">€{{ item.total.toFixed(2) }}</span>
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
                <v-list-item @click="$router.push(`/orders/${item.id}`)">
                  <template v-slot:prepend>
                    <v-icon>mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>View Details</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="printOrder(item)"
                  :disabled="!authStore.hasPermission('manager')"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-printer</v-icon>
                  </template>
                  <v-list-item-title>Print Invoice</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="sendEmail(item)"
                  :disabled="!authStore.hasPermission('manager')"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-email</v-icon>
                  </template>
                  <v-list-item-title>Send Email</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  @click="cancelOrder(item)"
                  :disabled="!authStore.hasPermission('admin') || item.status === 'cancelled'"
                  class="error--text"
                >
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-cancel</v-icon>
                  </template>
                  <v-list-item-title>Cancel Order</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Status Update Menu -->
    <v-menu
      v-model="statusMenu"
      :position-x="statusMenuX"
      :position-y="statusMenuY"
      absolute
      offset-y
    >
      <v-list>
        <v-list-item
          v-for="status in statusOptions"
          :key="status.value"
          @click="updateOrderStatus(selectedOrder, status.value)"
        >
          <v-list-item-title>{{ status.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Cancel Order Dialog -->
    <v-dialog v-model="cancelDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Cancel Order</v-card-title>
        <v-card-text>
          Are you sure you want to cancel order #{{ selectedOrder?.order_number }}?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelDialog = false">Keep Order</v-btn>
          <v-btn color="error" variant="text" @click="confirmCancel" :loading="isCancelling">
            Cancel Order
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
const isCancelling = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')
const dates = ref([])
const dateMenu = ref(false)
const itemsPerPage = ref(10)
const sortBy = ref([{ key: 'created_at', order: 'desc' }])
const sortDesc = ref([true])
const statusMenu = ref(false)
const statusMenuX = ref(0)
const statusMenuY = ref(0)
const selectedOrder = ref(null)
const cancelDialog = ref(false)

const orders = ref([])
const statusOptions = ref([
  { title: 'Pending', value: 'pending' },
  { title: 'Processing', value: 'processing' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' }
])

const headers = [
  { title: 'Order #', key: 'order_number', width: '120px' },
  { title: 'Customer', key: 'customer_email', width: '200px' },
  { title: 'Status', key: 'status', width: '120px' },
  { title: 'Total', key: 'total', width: '100px' },
  { title: 'Items', key: 'item_count', width: '80px' },
  { title: 'Date', key: 'created_at', width: '120px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
]

const filteredOrders = computed(() => {
  let filtered = orders.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order =>
      order.order_number.toLowerCase().includes(query) ||
      order.customer_email.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(order => order.status === selectedStatus.value)
  }

  if (dates.value.length === 2) {
    const [startDate, endDate] = dates.value
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  return filtered
})

const dateRangeText = computed(() => {
  if (dates.value.length === 2) {
    return dates.value.map(date => format(new Date(date), 'MMM dd, yyyy')).join(' - ')
  }
  return 'Select dates'
})

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const debouncedSearch = (() => {
  let timeout: NodeJS.Timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterOrders()
    }, 300)
  }
})()

const filterOrders = () => {
  // Trigger computed property recalculation
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  dates.value = []
}

const handleDateChange = () => {
  dateMenu.value = false
  filterOrders()
}

const handleSort = (options: any) => {
  sortBy.value = options.sortBy
  sortDesc.value = options.sortDesc
}

const showStatusMenu = (order: any, event: MouseEvent) => {
  selectedOrder.value = order
  statusMenuX.value = event.clientX
  statusMenuY.value = event.clientY
  statusMenu.value = true
}

const updateOrderStatus = async (order: any, newStatus: string) => {
  try {
    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await response.json()

    if (data.success) {
      order.status = newStatus
      statusMenu.value = false
    }
  } catch (error) {
    console.error('Failed to update order status:', error)
  }
}

const createOrder = () => {
  // Navigate to order creation page or open modal
  console.log('Create new order')
}

const printOrder = (order: any) => {
  // Open print dialog or generate PDF
  window.open(`/api/orders/${order.id}/invoice`, '_blank')
}

const sendEmail = (order: any) => {
  // Send order confirmation or status update email
  console.log('Send email for order:', order.id)
}

const cancelOrder = (order: any) => {
  selectedOrder.value = order
  cancelDialog.value = true
}

const confirmCancel = async () => {
  if (!selectedOrder.value) return

  try {
    isCancelling.value = true
    const response = await fetch(`/api/orders/${selectedOrder.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    })

    if (response.ok) {
      selectedOrder.value.status = 'cancelled'
      cancelDialog.value = false
      selectedOrder.value = null
    }
  } catch (error) {
    console.error('Failed to cancel order:', error)
  } finally {
    isCancelling.value = false
  }
}

const loadOrders = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/orders')
    const data = await response.json()

    if (data.success) {
      orders.value = data.data
    }
  } catch (error) {
    console.error('Failed to load orders:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadOrders()
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