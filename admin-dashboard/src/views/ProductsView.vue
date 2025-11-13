<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Products</h1>
            <p class="text-body-1 text-medium-emphasis">
              Manage your product catalog and inventory
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            to="/products/create"
            :disabled="!authStore.hasPermission('admin')"
          >
            Add Product
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters and Search -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
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
          @update:model-value="filterProducts"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedStatus"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          clearable
          @update:model-value="filterProducts"
        ></v-select>
      </v-col>
    </v-row>

    <!-- Products Table -->
    <v-card class="dashboard-card">
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredProducts"
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

          <template v-slot:item.price="{ item }">
            <span class="font-weight-medium">€{{ item.price.toFixed(2) }}</span>
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

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.status === 'active' ? 'success' : 'error'"
              size="small"
              variant="flat"
            >
              {{ item.status }}
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
                <v-list-item @click="$router.push(`/products/${item.id}`)">
                  <template v-slot:prepend>
                    <v-icon>mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>View Details</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="$router.push(`/products/${item.id}/edit`)"
                  :disabled="!authStore.hasPermission('admin')"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="duplicateProduct(item)"
                  :disabled="!authStore.hasPermission('admin')"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-content-copy</v-icon>
                  </template>
                  <v-list-item-title>Duplicate</v-list-item-title>
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
                  @click="deleteProduct(item)"
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
        <v-card-title class="text-h6">Delete Product</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ selectedProduct?.name }}"?
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
const selectedCategory = ref('')
const selectedStatus = ref('')
const itemsPerPage = ref(10)
const sortBy = ref([{ key: 'created_at', order: 'desc' }])
const sortDesc = ref([true])
const deleteDialog = ref(false)
const selectedProduct = ref(null)

const products = ref([])
const categories = ref(['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'])
const statusOptions = ref([
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
])

const headers = [
  { title: 'Image', key: 'image', width: '80px', sortable: false },
  { title: 'Product', key: 'name', width: '200px' },
  { title: 'Category', key: 'category', width: '120px' },
  { title: 'Price', key: 'price', width: '100px' },
  { title: 'Stock', key: 'stock_quantity', width: '100px' },
  { title: 'Status', key: 'status', width: '100px' },
  { title: 'Created', key: 'created_at', width: '120px' },
  { title: 'Actions', key: 'actions', width: '80px', sortable: false }
]

const filteredProducts = computed(() => {
  let filtered = products.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(product => product.category === selectedCategory.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(product => product.status === selectedStatus.value)
  }

  return filtered
})

const getStockColor = (quantity: number) => {
  if (quantity === 0) return 'error'
  if (quantity <= 10) return 'warning'
  return 'success'
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const debouncedSearch = (() => {
  let timeout: NodeJS.Timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterProducts()
    }, 300)
  }
})()

const filterProducts = () => {
  // Trigger computed property recalculation
}

const handleSort = (options: any) => {
  sortBy.value = options.sortBy
  sortDesc.value = options.sortDesc
}

const loadProducts = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/products')
    const data = await response.json()

    if (data.success) {
      products.value = data.data
    }
  } catch (error) {
    console.error('Failed to load products:', error)
  } finally {
    isLoading.value = false
  }
}

const duplicateProduct = async (product: any) => {
  try {
    const response = await fetch(`/api/products/${product.id}/duplicate`, {
      method: 'POST'
    })
    const data = await response.json()

    if (data.success) {
      await loadProducts()
    }
  } catch (error) {
    console.error('Failed to duplicate product:', error)
  }
}

const toggleStatus = async (product: any) => {
  try {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    const response = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await response.json()

    if (data.success) {
      product.status = newStatus
    }
  } catch (error) {
    console.error('Failed to toggle product status:', error)
  }
}

const deleteProduct = (product: any) => {
  selectedProduct.value = product
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!selectedProduct.value) return

  try {
    isDeleting.value = true
    const response = await fetch(`/api/products/${selectedProduct.value.id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      deleteDialog.value = false
      selectedProduct.value = null
      await loadProducts()
    }
  } catch (error) {
    console.error('Failed to delete product:', error)
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadProducts()
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