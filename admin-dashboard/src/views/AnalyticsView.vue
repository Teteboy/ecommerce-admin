<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Analytics</h1>
            <p class="text-body-1 text-medium-emphasis">
              Comprehensive insights into your business performance
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-download"
            @click="exportData"
          >
            Export Report
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Date Range Selector -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
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
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedPeriod"
          :items="periodOptions"
          label="Quick select"
          variant="outlined"
          @update:model-value="setQuickPeriod"
        ></v-select>
      </v-col>
      <v-col cols="12" md="4">
        <v-btn
          color="secondary"
          variant="outlined"
          block
          @click="refreshData"
          :loading="isLoading"
        >
          Refresh Data
        </v-btn>
      </v-col>
    </v-row>

    <!-- Key Metrics -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-primary pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-shopping</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ metrics.totalOrders }}
              </div>
              <div class="text-caption white--text opacity-8">Total Orders</div>
              <div class="text-caption white--text opacity-6">
                +{{ metrics.orderGrowth }}% from last period
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-success pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-currency-eur</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                €{{ metrics.totalRevenue.toLocaleString() }}
              </div>
              <div class="text-caption white--text opacity-8">Total Revenue</div>
              <div class="text-caption white--text opacity-6">
                +{{ metrics.revenueGrowth }}% from last period
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-warning pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-account-group</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ metrics.totalCustomers }}
              </div>
              <div class="text-caption white--text opacity-8">Total Customers</div>
              <div class="text-caption white--text opacity-6">
                +{{ metrics.customerGrowth }}% from last period
              </div>
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
                €{{ metrics.averageOrderValue.toFixed(2) }}
              </div>
              <div class="text-caption white--text opacity-8">Avg. Order Value</div>
              <div class="text-caption white--text opacity-6">
                +{{ metrics.aovGrowth }}% from last period
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts Row -->
    <v-row class="mb-6">
      <!-- Revenue Chart -->
      <v-col cols="12" lg="8">
        <v-card class="dashboard-card pa-6">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Revenue Trend</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Daily revenue over selected period</p>
            </div>
            <v-select
              v-model="chartType"
              :items="chartTypeOptions"
              density="compact"
              variant="outlined"
              class="w-auto"
            ></v-select>
          </v-card-title>
          <v-card-text>
            <div class="chart-container">
              <Line :data="revenueChartData" :options="chartOptions" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Products -->
      <v-col cols="12" lg="4">
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold mb-1">Top Products</h2>
            <p class="text-caption text-medium-emphasis mb-0">By revenue</p>
          </v-card-title>
          <v-card-text>
            <div v-for="product in topProducts" :key="product.name" class="mb-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium">{{ product.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ product.quantity_sold }} sold</div>
                </div>
                <div class="text-right">
                  <div class="text-body-2 font-weight-bold">€{{ product.revenue.toFixed(0) }}</div>
                </div>
              </div>
              <v-progress-linear
                :value="topProducts.length > 0 ? (product.revenue / Math.max(...topProducts.map(p => p.revenue))) * 100 : 0"
                color="primary"
                height="4"
              ></v-progress-linear>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Additional Charts -->
    <v-row>
      <!-- Customer Acquisition -->
      <v-col cols="12" md="6">
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold mb-1">Customer Acquisition</h2>
            <p class="text-caption text-medium-emphasis mb-0">New customers over time</p>
          </v-card-title>
          <v-card-text>
            <div class="chart-container">
              <Line :data="customerChartData" :options="smallChartOptions" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Order Status Distribution -->
      <v-col cols="12" md="6">
        <v-card class="dashboard-card pa-6">
          <v-card-title>
            <h2 class="text-h6 font-weight-bold mb-1">Order Status Distribution</h2>
            <p class="text-caption text-medium-emphasis mb-0">Current order statuses</p>
          </v-card-title>
          <v-card-text>
            <div class="chart-container">
              <Doughnut :data="statusChartData" :options="doughnutOptions" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { format } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const isLoading = ref(false)
const dateMenu = ref(false)
const dates = ref<string[]>([])
const selectedPeriod = ref('30d')
const chartType = ref('revenue')

const periodOptions = ref([
  { title: 'Last 7 days', value: '7d' },
  { title: 'Last 30 days', value: '30d' },
  { title: 'Last 90 days', value: '90d' },
  { title: 'Last year', value: '1y' }
])

const chartTypeOptions = ref([
  { title: 'Revenue', value: 'revenue' },
  { title: 'Orders', value: 'orders' },
  { title: 'Customers', value: 'customers' }
])

const metrics = reactive({
  totalOrders: 0,
  totalRevenue: 0,
  totalCustomers: 0,
  averageOrderValue: 0,
  orderGrowth: 0,
  revenueGrowth: 0,
  customerGrowth: 0,
  aovGrowth: 0
})

const topProducts = ref<any[]>([])
const revenueChartData = ref({
  labels: [] as string[],
  datasets: [{
    label: 'Revenue',
    data: [] as number[],
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const customerChartData = ref({
  labels: [] as string[],
  datasets: [{
    label: 'New Customers',
    data: [] as number[],
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const statusChartData = ref({
  labels: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  datasets: [{
    data: [] as number[],
    backgroundColor: [
      '#fbbf24',
      '#3b82f6',
      '#8b5cf6',
      '#10b981',
      '#ef4444'
    ]
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

const smallChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const
    }
  }
}

const dateRangeText = computed(() => {
  if (dates.value.length === 2) {
    return dates.value.map(date => format(new Date(date), 'MMM dd, yyyy')).join(' - ')
  }
  return 'Select date range'
})

const setQuickPeriod = (): void => {
  const now = new Date()
  let startDate = new Date()

  switch (selectedPeriod.value) {
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1)
      break
  }

  dates.value = [
    startDate.toISOString().split('T')[0],
    now.toISOString().split('T')[0]
  ]
  loadAnalyticsData()
}

const handleDateChange = (): void => {
  dateMenu.value = false
  loadAnalyticsData()
}

const loadAnalyticsData = async (): Promise<void> => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('auth_token')
    const startDate = dates.value[0] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = dates.value[1] || new Date().toISOString().split('T')[0]

    const response = await fetch(`/api/analytics/comprehensive?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      Object.assign(metrics, data.data.metrics)
      topProducts.value = data.data.topProducts

      // Update charts
      revenueChartData.value.labels = data.data.revenueChart.labels
      revenueChartData.value.datasets[0].data = data.data.revenueChart.data

      customerChartData.value.labels = data.data.customerChart.labels
      customerChartData.value.datasets[0].data = data.data.customerChart.data

      statusChartData.value.datasets[0].data = data.data.statusDistribution
    }
  } catch (error) {
    console.error('Failed to load analytics data:', error)
  } finally {
    isLoading.value = false
  }
}

const refreshData = (): void => {
  loadAnalyticsData()
}

const exportData = (): void => {
  // Export analytics data as CSV/PDF
  console.log('Export analytics data')
}

onMounted(() => {
  setQuickPeriod()
})
</script>

<style scoped>
.chart-container {
  height: 300px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 1rem;
}
</style>