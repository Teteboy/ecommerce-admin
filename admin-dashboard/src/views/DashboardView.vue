<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Dashboard</h1>
            <p class="text-body-1 text-medium-emphasis">
              Welcome back, {{ user?.firstName }}! Here's what's happening with your business.
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-refresh"
            @click="refreshData"
            :loading="isLoading"
          >
            Refresh
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-primary pa-6" elevation="0">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-shopping</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.orders.total }}
              </div>
              <div class="text-caption white--text opacity-8">Total Orders</div>
            </div>
          </div>
          <div class="mt-4">
            <v-chip size="small" color="white" variant="outlined" class="white--text">
              <v-icon size="16" class="mr-1">mdi-trending-up</v-icon>
              +12% this month
            </v-chip>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-success pa-6" elevation="0">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-currency-eur</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                €{{ stats.orders.totalRevenue.toLocaleString() }}
              </div>
              <div class="text-caption white--text opacity-8">Total Revenue</div>
            </div>
          </div>
          <div class="mt-4">
            <v-chip size="small" color="white" variant="outlined" class="white--text">
              <v-icon size="16" class="mr-1">mdi-trending-up</v-icon>
              +8% this month
            </v-chip>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-warning pa-6" elevation="0">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-package-variant</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.products.total }}
              </div>
              <div class="text-caption white--text opacity-8">Total Products</div>
            </div>
          </div>
          <div class="mt-4">
            <v-chip size="small" color="white" variant="outlined" class="white--text">
              <v-icon size="16" class="mr-1">mdi-package-variant-closed</v-icon>
              {{ stats.products.active }} active
            </v-chip>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-info pa-6" elevation="0">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-account-group</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.customers.total }}
              </div>
              <div class="text-caption white--text opacity-8">Total Customers</div>
            </div>
          </div>
          <div class="mt-4">
            <v-chip size="small" color="white" variant="outlined" class="white--text">
              <v-icon size="16" class="mr-1">mdi-account-plus</v-icon>
              +{{ stats.customers.new30Days }} new
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts and Recent Activity -->
    <v-row>
      <!-- Sales Chart -->
      <v-col cols="12" lg="8">
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Sales Overview</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Revenue trends over the last 30 days</p>
            </div>
            <v-select
              v-model="chartPeriod"
              :items="['7d', '30d', '90d']"
              density="compact"
              variant="outlined"
              class="w-auto"
              @update:model-value="loadChartData"
            ></v-select>
          </v-card-title>
          <v-card-text>
            <div class="chart-container">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </v-card-text>
        </v-card>

        <!-- Recent Orders -->
        <v-card class="dashboard-card pa-6">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Recent Orders</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Latest customer orders</p>
            </div>
            <v-btn text color="primary" to="/orders">
              View All
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="orderHeaders"
              :items="recentOrders"
              :items-per-page="5"
              density="compact"
              class="transparent-table"
            >
              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  variant="flat"
                >
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.total="{ item }">
                €{{ item.total.toFixed(2) }}
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  :to="`/orders/${item.id}`"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" lg="4">
        <!-- Top Products -->
        <v-card class="dashboard-card pa-6 mb-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold mb-1">Top Products</h2>
            <p class="text-caption text-medium-emphasis mb-0">Best performing items</p>
          </v-card-title>
          <v-card-text>
            <div v-for="product in topProducts.slice(0, 5)" :key="product.name" class="mb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium">{{ product.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ product.quantity_sold }} sold</div>
                </div>
                <div class="text-right">
                  <div class="text-body-2 font-weight-bold">€{{ product.revenue.toFixed(0) }}</div>
                </div>
              </div>
              <v-progress-linear
                :value="topProducts.length > 0 ? (product.quantity_sold / Math.max(...topProducts.map(p => p.quantity_sold))) * 100 : 0"
                color="primary"
                height="4"
                class="mt-2"
              ></v-progress-linear>
            </div>
          </v-card-text>
        </v-card>

        <!-- Quick Actions -->
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold mb-1">Quick Actions</h2>
            <p class="text-caption text-medium-emphasis mb-0">Common tasks</p>
          </v-card-title>
          <v-card-text>
            <v-btn
              block
              color="primary"
              class="mb-3"
              to="/products/create"
              prepend-icon="mdi-plus"
            >
              Add Product
            </v-btn>
            <v-btn
              block
              color="success"
              class="mb-3"
              to="/orders"
              prepend-icon="mdi-shopping"
            >
              View Orders
            </v-btn>
            <v-btn
              block
              color="info"
              class="mb-3"
              to="/analytics"
              prepend-icon="mdi-chart-line"
            >
              View Analytics
            </v-btn>
            <v-btn
              block
              color="warning"
              variant="outlined"
              to="/inventory"
              prepend-icon="mdi-warehouse"
            >
              Check Inventory
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { format } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const isLoading = ref(false)
const chartPeriod = ref('30d')

const stats = reactive({
  orders: {
    total: 0,
    completed: 0,
    pending: 0,
    paid: 0,
    revenue30Days: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  },
  products: {
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0
  },
  customers: {
    total: 0,
    new30Days: 0,
    averageValue: 0
  }
})

const recentOrders = ref<any[]>([])
const topProducts = ref<any[]>([])
const chartData = ref({
  labels: [],
  datasets: [{
    label: 'Revenue',
    data: [],
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `€${context.parsed.y.toLocaleString()}`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) => `€${value.toLocaleString()}`
      }
    }
  }
}

const orderHeaders = [
  { title: 'Order #', key: 'order_number', width: '120px' },
  { title: 'Customer', key: 'customer_email' },
  { title: 'Status', key: 'status', width: '100px' },
  { title: 'Total', key: 'total', width: '100px' },
  { title: 'Date', key: 'created_at', width: '120px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
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
  return format(new Date(date), 'MMM dd, yyyy')
}

const refreshData = async (): Promise<void> => {
  await loadDashboardData()
  await loadChartData()
}

const loadDashboardData = async (): Promise<void> => {
  try {
    isLoading.value = true
    console.log('Dashboard: Making request to /api/analytics/dashboard/overview')
    const token = localStorage.getItem('auth_token')
    console.log('Dashboard: Token from localStorage:', token ? token.substring(0, 20) + '...' : 'null')

    const response = await fetch('/api/analytics/dashboard/overview', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    console.log('Dashboard: Response status:', response.status)
    const data = await response.json()

    if (data.success) {
      Object.assign(stats, data.data.overview)
      recentOrders.value = data.data.recentOrders
      topProducts.value = data.data.topProducts
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    isLoading.value = false
  }
}

const loadChartData = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/analytics/sales?groupBy=day&startDate=${getStartDate()}&endDate=${new Date().toISOString().split('T')[0]}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      chartData.value.labels = data.data.sales.map((item: any) => format(new Date(item.period), 'MMM dd'))
      chartData.value.datasets[0].data = data.data.sales.map((item: any) => item.revenue)
    }
  } catch (error) {
    console.error('Failed to load chart data:', error)
  }
}

const getStartDate = () => {
  const days = chartPeriod.value === '7d' ? 7 : chartPeriod.value === '90d' ? 90 : 30
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

onMounted(() => {
  loadDashboardData()
  loadChartData()
})
</script>

<style scoped>
.transparent-table :deep(.v-data-table__td),
.transparent-table :deep(.v-data-table__th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.transparent-table :deep(.v-data-table__tbody tr:hover) {
  background: rgba(59, 130, 246, 0.1) !important;
  transform: scale(1.01);
  transition: all 0.3s ease;
}

/* Enhanced dashboard cards */
.dashboard-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.dashboard-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.05) 0%, transparent 50%);
  opacity: 0.8;
  pointer-events: none;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

/* Enhanced stats cards with gradients */
.stats-gradient-primary {
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 50%, #581c87 100%) !important;
  position: relative;
  overflow: hidden;
}

.stats-gradient-primary::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite;
}

.stats-gradient-success {
  background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0f766e 100%) !important;
  position: relative;
  overflow: hidden;
}

.stats-gradient-success::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite reverse;
}

.stats-gradient-warning {
  background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%) !important;
  position: relative;
  overflow: hidden;
}

.stats-gradient-warning::before {
  content: '';
  position: absolute;
  bottom: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite 1s;
}

.stats-gradient-info {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%) !important;
  position: relative;
  overflow: hidden;
}

.stats-gradient-info::before {
  content: '';
  position: absolute;
  bottom: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite reverse 1s;
}

/* Enhanced chart container */
.chart-container {
  height: 300px;
  position: relative;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Enhanced progress bars */
.v-progress-linear {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Enhanced buttons */
.v-btn {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.v-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.v-btn:hover::before {
  left: 100%;
}

.v-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

/* Enhanced chips */
.v-chip {
  border-radius: 20px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Floating animations */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

/* Enhanced data table */
.v-data-table :deep(.v-data-table__thead th) {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
}

.v-data-table :deep(.v-data-table__tbody tr) {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.v-data-table :deep(.v-data-table__tbody tr:hover) {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.02) 100%) !important;
  transform: scale(1.01);
}

/* Enhanced select dropdown */
.v-select {
  border-radius: 12px;
}

/* Page header enhancement */
.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
</style>