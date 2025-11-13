<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Inventory</h1>
            <p class="text-body-1 text-medium-emphasis">
              Monitor and manage your product stock levels
            </p>
          </div>
          <div class="d-flex gap-2">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="addStock"
            >
              Add Stock
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-download"
              @click="exportInventory"
            >
              Export
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Inventory Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-primary pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-package-variant</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.totalProducts }}
              </div>
              <div class="text-caption white--text opacity-8">Total Products</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-success pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-check-circle</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.inStock }}
              </div>
              <div class="text-caption white--text opacity-8">In Stock</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-warning pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-alert</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.lowStock }}
              </div>
              <div class="text-caption white--text opacity-8">Low Stock</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="dashboard-card stats-gradient-error pa-6">
          <div class="d-flex align-center">
            <div class="mr-4">
              <v-icon size="48" color="white">mdi-cancel</v-icon>
            </div>
            <div>
              <div class="text-h4 font-weight-bold white--text mb-1">
                {{ stats.outOfStock }}
              </div>
              <div class="text-caption white--text opacity-8">Out of Stock</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters and Search -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="searchQuery"
          label="Search products"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          @input="debouncedSearch"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedCategory"
          :items="categories"
          label="Category"
          variant="outlined"
          clearable
          @update:model-value="filterInventory"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedStatus"
          :items="stockStatusOptions"
          label="Stock Status"
          variant="outlined"
          clearable
          @update:model-value="filterInventory"
        ></v-select>
      </v-col>
      <v-col cols="12" md="2">
        <v-btn
          color="secondary"
          variant="outlined"
          block
          @click="clearFilters"
        >
          Clear
        </v-btn>
      </v-col>
    </v-row>

    <!-- Inventory Table -->
    <v-card class="dashboard-card">
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredInventory"
          :items-per-page="itemsPerPage"
          :loading="isLoading"
          density="compact"
          class="transparent-table"
          :sort-by="sortBy"
          :sort-desc="sortDesc"
          @update:options="handleSort"
        >
          <template v-slot:item.image="{ item }">
            <v-avatar size="40">
              <v-img :src="item.image || '/placeholder-product.png'" :alt="item.name"></v-img>
            </v-avatar>
          </template>

          <template v-slot:item.name="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">{{ item.name }}</span>
              <span class="text-caption text-medium-emphasis">{{ item.sku }}</span>
            </div>
          </template>

          <template v-slot:item.stock_quantity="{ item }">
            <v-chip
              :color="getStockColor(item.stock_quantity)"
              size="small"
              variant="flat"
            >
              {{ item.stock_quantity }}
            </v-chip>
          </template>

          <template v-slot:item.reorder_point="{ item }">
            <span class="text-body-2">{{ item.reorder_point || 'N/A' }}</span>
          </template>

          <template v-slot:item.last_updated="{ item }">
            {{ formatDate(item.last_updated) }}
          </template>

          <template v-slot:item.actions="{ item }">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon size="small" variant="text" v-bind="props">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="viewProduct(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>View Product</v-list-item-title>
                </v-list-item>
                <v-list-item @click="adjustStock(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-plus-minus</v-icon>
                  </template>
                  <v-list-item-title>Adjust Stock</v-list-item-title>
                </v-list-item>
                <v-list-item @click="setReorderPoint(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-tune</v-icon>
                  </template>
                  <v-list-item-title>Set Reorder Point</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item @click="viewStockHistory(item)">
                  <template v-slot:prepend>
                    <v-icon>mdi-history</v-icon>
                  </template>
                  <v-list-item-title>Stock History</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Stock Adjustment Dialog -->
    <v-dialog v-model="stockDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Adjust Stock - {{ selectedProduct?.name }}
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <div class="text-body-2 mb-4">
                Current stock: <strong>{{ selectedProduct?.stock_quantity }}</strong>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="adjustmentType"
                :items="adjustmentTypes"
                label="Adjustment Type"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="adjustmentQuantity"
                label="Quantity"
                type="number"
                variant="outlined"
                :rules="quantityRules"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="adjustmentReason"
                label="Reason (optional)"
                variant="outlined"
                rows="2"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="stockDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="text" @click="confirmStockAdjustment" :loading="isAdjusting">
            Adjust Stock
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reorder Point Dialog -->
    <v-dialog v-model="reorderDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Set Reorder Point</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="reorderPoint"
            label="Reorder Point"
            type="number"
            variant="outlined"
            :rules="reorderRules"
            hint="You'll be notified when stock falls below this level"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="reorderDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="text" @click="confirmReorderPoint" :loading="isSettingReorder">
            Set Point
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { format } from 'date-fns'

const isLoading = ref(false)
const isAdjusting = ref(false)
const isSettingReorder = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const itemsPerPage = ref(10)
const sortBy = ref<string[]>(['stock_quantity'])
const sortDesc = ref<boolean[]>([true])
const stockDialog = ref(false)
const reorderDialog = ref(false)
const selectedProduct = ref<any>(null)
const adjustmentType = ref('add')
const adjustmentQuantity = ref(0)
const adjustmentReason = ref('')
const reorderPoint = ref(0)

const inventory = ref<any[]>([])
const stats = reactive({
  totalProducts: 0,
  inStock: 0,
  lowStock: 0,
  outOfStock: 0
})

const categories = ref(['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'])
const stockStatusOptions = ref([
  { title: 'In Stock', value: 'in_stock' },
  { title: 'Low Stock', value: 'low_stock' },
  { title: 'Out of Stock', value: 'out_of_stock' }
])

const adjustmentTypes = ref([
  { title: 'Add Stock', value: 'add' },
  { title: 'Remove Stock', value: 'remove' },
  { title: 'Set to Specific Amount', value: 'set' }
])

const headers = [
  { title: 'Image', key: 'image', width: '80px', sortable: false },
  { title: 'Product', key: 'name', width: '250px' },
  { title: 'Category', key: 'category', width: '120px' },
  { title: 'Stock', key: 'stock_quantity', width: '100px' },
  { title: 'Reorder Point', key: 'reorder_point', width: '120px' },
  { title: 'Last Updated', key: 'last_updated', width: '150px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
]

const filteredInventory = computed(() => {
  let filtered = inventory.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(item => item.category === selectedCategory.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(item => {
      switch (selectedStatus.value) {
        case 'in_stock':
          return item.stock_quantity > (item.reorder_point || 10)
        case 'low_stock':
          return item.stock_quantity > 0 && item.stock_quantity <= (item.reorder_point || 10)
        case 'out_of_stock':
          return item.stock_quantity === 0
        default:
          return true
      }
    })
  }

  return filtered
})

const quantityRules = [
  (v: number) => v > 0 || 'Quantity must be greater than 0'
]

const reorderRules = [
  (v: number) => v >= 0 || 'Reorder point must be positive'
]

const getStockColor = (quantity: number) => {
  if (quantity === 0) return 'error'
  if (quantity <= 10) return 'warning'
  return 'success'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

const debouncedSearch = (() => {
  let timeout: number
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterInventory()
    }, 300)
  }
})()

const filterInventory = () => {
  // Trigger computed property recalculation
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedStatus.value = ''
}

const handleSort = (options: any) => {
  sortBy.value = options.sortBy || ['stock_quantity']
  sortDesc.value = options.sortDesc || [true]
}

const viewProduct = (product: any) => {
  // Navigate to product detail page
  console.log('View product:', product.id)
}

const adjustStock = (product: any) => {
  selectedProduct.value = product
  adjustmentType.value = 'add'
  adjustmentQuantity.value = 0
  adjustmentReason.value = ''
  stockDialog.value = true
}

const confirmStockAdjustment = async (): Promise<void> => {
  if (!selectedProduct.value) return

  try {
    isAdjusting.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        productId: selectedProduct.value.id,
        type: adjustmentType.value,
        quantity: adjustmentQuantity.value,
        reason: adjustmentReason.value
      })
    })

    if (response.ok) {
      stockDialog.value = false
      await loadInventory()
    }
  } catch (error) {
    console.error('Failed to adjust stock:', error)
  } finally {
    isAdjusting.value = false
  }
}

const setReorderPoint = (product: any) => {
  selectedProduct.value = product
  reorderPoint.value = product.reorder_point || 10
  reorderDialog.value = true
}

const confirmReorderPoint = async (): Promise<void> => {
  if (!selectedProduct.value) return

  try {
    isSettingReorder.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/inventory/reorder-point`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        productId: selectedProduct.value.id,
        reorderPoint: reorderPoint.value
      })
    })

    if (response.ok) {
      reorderDialog.value = false
      selectedProduct.value.reorder_point = reorderPoint.value
    }
  } catch (error) {
    console.error('Failed to set reorder point:', error)
  } finally {
    isSettingReorder.value = false
  }
}

const viewStockHistory = (product: any): void => {
  // Open stock history modal or navigate to history page
  console.log('View stock history for:', product.id)
}

const addStock = (): void => {
  // Open bulk stock addition modal
  console.log('Add stock to multiple products')
}

const exportInventory = (): void => {
  // Export inventory data as CSV
  console.log('Export inventory data')
}

const loadInventory = async (): Promise<void> => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/inventory', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      inventory.value = data.data.inventory || []
      Object.assign(stats, data.data.stats || stats)
    }
  } catch (error) {
    console.error('Failed to load inventory:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadInventory()
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