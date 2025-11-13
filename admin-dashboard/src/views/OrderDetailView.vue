<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-btn
              icon
              variant="text"
              @click="$router.go(-1)"
              class="mr-4"
            >
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <div>
              <h1 class="text-h4 font-weight-bold mb-2">
                Order #{{ order?.order_number }}
              </h1>
              <p class="text-body-1 text-medium-emphasis">
                Placed on {{ formatDate(order?.created_at) }}
              </p>
            </div>
          </div>
          <div class="d-flex gap-2">
            <v-btn
              variant="outlined"
              @click="printInvoice"
            >
              <v-icon left>mdi-printer</v-icon>
              Print
            </v-btn>
            <v-btn
              color="primary"
              @click="updateStatus"
              :disabled="!authStore.hasPermission('manager')"
            >
              Update Status
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Order Details -->
      <v-col cols="12" lg="8">
        <!-- Order Status -->
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title class="d-flex align-center justify-space-between">
            <h2 class="text-h6 font-weight-bold">Order Status</h2>
            <v-chip
              :color="getStatusColor(order?.status)"
              size="large"
              variant="flat"
            >
              {{ order?.status }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-timeline density="compact">
              <v-timeline-item
                v-for="status in orderStatuses"
                :key="status.status"
                :dot-color="getStatusColor(status.status)"
                size="small"
              >
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ status.status }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ status.timestamp ? formatDate(status.timestamp) : 'Pending' }}
                    </div>
                  </div>
                  <v-icon
                    v-if="status.completed"
                    color="success"
                    size="16"
                  >
                    mdi-check-circle
                  </v-icon>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>

        <!-- Order Items -->
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold">Order Items</h2>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="itemHeaders"
              :items="order?.items || []"
              density="compact"
              class="transparent-table"
              hide-default-footer
            >
              <template v-slot:item.product="{ item }">
                <div class="d-flex align-center">
                  <v-avatar size="40" class="mr-3">
                    <v-img :src="item.product_image || '/placeholder-product.png'" :alt="item.product_name"></v-img>
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">{{ item.product_name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.sku }}</div>
                  </div>
                </div>
              </template>

              <template v-slot:item.quantity="{ item }">
                <span class="font-weight-medium">{{ item.quantity }}</span>
              </template>

              <template v-slot:item.price="{ item }">
                <span class="font-weight-medium">€{{ item.price.toFixed(2) }}</span>
              </template>

              <template v-slot:item.total="{ item }">
                <span class="font-weight-medium">€{{ (item.quantity * item.price).toFixed(2) }}</span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <!-- Order Notes -->
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold">Order Notes</h2>
          </v-card-title>
          <v-card-text>
            <v-textarea
              v-model="notes"
              label="Internal notes"
              variant="outlined"
              rows="3"
              :disabled="!authStore.hasPermission('manager')"
              @blur="saveNotes"
            ></v-textarea>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" lg="4">
        <!-- Customer Information -->
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold">Customer Information</h2>
          </v-card-title>
          <v-card-text>
            <div class="mb-4">
              <div class="font-weight-medium mb-1">{{ order?.customer_name }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ order?.customer_email }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ order?.customer_phone }}</div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="mb-4">
              <h3 class="text-subtitle-2 font-weight-bold mb-2">Shipping Address</h3>
              <div class="text-body-2">
                {{ order?.shipping_address?.street }}<br>
                {{ order?.shipping_address?.city }}, {{ order?.shipping_address?.state }} {{ order?.shipping_address?.zip_code }}<br>
                {{ order?.shipping_address?.country }}
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div>
              <h3 class="text-subtitle-2 font-weight-bold mb-2">Billing Address</h3>
              <div class="text-body-2">
                {{ order?.billing_address?.street }}<br>
                {{ order?.billing_address?.city }}, {{ order?.billing_address?.state }} {{ order?.billing_address?.zip_code }}<br>
                {{ order?.billing_address?.country }}
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Order Summary -->
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold">Order Summary</h2>
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between mb-2">
              <span>Subtotal:</span>
              <span>€{{ order?.subtotal?.toFixed(2) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>Shipping:</span>
              <span>€{{ order?.shipping_cost?.toFixed(2) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>Tax:</span>
              <span>€{{ order?.tax?.toFixed(2) }}</span>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-space-between text-h6 font-weight-bold">
              <span>Total:</span>
              <span>€{{ order?.total?.toFixed(2) }}</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Payment Information -->
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold">Payment Information</h2>
          </v-card-title>
          <v-card-text>
            <div class="mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="mr-2" :color="order?.payment_status === 'paid' ? 'success' : 'warning'">
                  {{ order?.payment_status === 'paid' ? 'mdi-check-circle' : 'mdi-clock-outline' }}
                </v-icon>
                <span class="font-weight-medium capitalize">{{ order?.payment_status }}</span>
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Method: {{ order?.payment_method }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Transaction ID: {{ order?.transaction_id }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Status Update Dialog -->
    <v-dialog v-model="statusDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">Update Order Status</v-card-title>
        <v-card-text>
          <v-select
            v-model="newStatus"
            :items="statusOptions"
            label="New Status"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="statusDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="text" @click="confirmStatusUpdate" :loading="isUpdating">
            Update Status
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'

const route = useRoute()
const authStore = useAuthStore()

const order = ref(null)
const notes = ref('')
const statusDialog = ref(false)
const newStatus = ref('')
const isUpdating = ref(false)

const statusOptions = ref([
  { title: 'Pending', value: 'pending' },
  { title: 'Processing', value: 'processing' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' }
])

const orderStatuses = ref([
  { status: 'Pending', completed: false, timestamp: null },
  { status: 'Processing', completed: false, timestamp: null },
  { status: 'Shipped', completed: false, timestamp: null },
  { status: 'Delivered', completed: false, timestamp: null }
])

const itemHeaders = [
  { title: 'Product', key: 'product', width: '300px' },
  { title: 'Quantity', key: 'quantity', width: '100px' },
  { title: 'Price', key: 'price', width: '100px' },
  { title: 'Total', key: 'total', width: '100px' }
]

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
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

const loadOrder = async () => {
  try {
    const response = await fetch(`/api/orders/${route.params.id}`)
    const data = await response.json()

    if (data.success) {
      order.value = data.data
      notes.value = data.data.notes || ''

      // Update status timeline
      updateStatusTimeline(data.data.status_history || [])
    }
  } catch (error) {
    console.error('Failed to load order:', error)
  }
}

const updateStatusTimeline = (statusHistory: any[]) => {
  const statusOrder = ['pending', 'processing', 'shipped', 'delivered']
  const currentStatusIndex = statusOrder.indexOf(order.value.status)

  orderStatuses.value.forEach((status, index) => {
    status.completed = index <= currentStatusIndex
    const historyItem = statusHistory.find(h => h.status === status.status.toLowerCase())
    status.timestamp = historyItem ? historyItem.timestamp : null
  })
}

const updateStatus = () => {
  newStatus.value = order.value.status
  statusDialog.value = true
}

const confirmStatusUpdate = async () => {
  try {
    isUpdating.value = true
    const response = await fetch(`/api/orders/${order.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus.value })
    })

    if (response.ok) {
      order.value.status = newStatus.value
      updateStatusTimeline([])
      statusDialog.value = false
    }
  } catch (error) {
    console.error('Failed to update order status:', error)
  } finally {
    isUpdating.value = false
  }
}

const saveNotes = async () => {
  try {
    await fetch(`/api/orders/${order.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes.value })
    })
  } catch (error) {
    console.error('Failed to save notes:', error)
  }
}

const printInvoice = () => {
  window.open(`/api/orders/${order.value.id}/invoice`, '_blank')
}

onMounted(() => {
  loadOrder()
})
</script>

<style scoped>
.transparent-table :deep(.v-data-table__td),
.transparent-table :deep(.v-data-table__th) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
}

.capitalize {
  text-transform: capitalize;
}
</style>