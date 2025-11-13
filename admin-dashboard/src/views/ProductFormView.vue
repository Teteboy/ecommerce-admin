<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
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
              {{ isEditing ? 'Edit Product' : 'Add New Product' }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">
              {{ isEditing ? 'Update product information' : 'Create a new product in your catalog' }}
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Form -->
    <v-form ref="form" v-model="valid" @submit.prevent="saveProduct">
      <v-row>
        <!-- Main Form -->
        <v-col cols="12" lg="8">
          <v-card class="dashboard-card pa-6 mb-6">
            <v-card-title class="pb-4">
              <h2 class="text-h6 font-weight-bold">Product Information</h2>
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.name"
                    label="Product Name *"
                    variant="outlined"
                    :rules="nameRules"
                    required
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.sku"
                    label="SKU *"
                    variant="outlined"
                    :rules="skuRules"
                    required
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.category"
                    :items="categories"
                    label="Category *"
                    variant="outlined"
                    :rules="categoryRules"
                    required
                    :disabled="isLoading"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="form.price"
                    label="Price (€) *"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    :rules="priceRules"
                    required
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="form.stock_quantity"
                    label="Stock Quantity *"
                    type="number"
                    variant="outlined"
                    :rules="stockRules"
                    required
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.status"
                    :items="statusOptions"
                    label="Status *"
                    variant="outlined"
                    :rules="statusRules"
                    required
                    :disabled="isLoading"
                  ></v-select>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="form.description"
                    label="Description"
                    variant="outlined"
                    rows="4"
                    :disabled="isLoading"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Additional Information -->
          <v-card class="dashboard-card pa-6">
            <v-card-title class="pb-4">
              <h2 class="text-h6 font-weight-bold">Additional Information</h2>
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.weight"
                    label="Weight (kg)"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.dimensions"
                    label="Dimensions (L x W x H)"
                    variant="outlined"
                    placeholder="10 x 5 x 2 cm"
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.brand"
                    label="Brand"
                    variant="outlined"
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.supplier"
                    label="Supplier"
                    variant="outlined"
                    :disabled="isLoading"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="form.tags"
                    label="Tags"
                    variant="outlined"
                    rows="2"
                    placeholder="Comma separated tags"
                    :disabled="isLoading"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Sidebar -->
        <v-col cols="12" lg="4">
          <!-- Product Image -->
          <v-card class="dashboard-card pa-6 mb-6">
            <v-card-title class="pb-4">
              <h2 class="text-h6 font-weight-bold">Product Image</h2>
            </v-card-title>
            <v-card-text>
              <div class="text-center">
                <v-avatar size="120" class="mb-4">
                  <v-img
                    :src="imagePreview || '/placeholder-product.png'"
                    alt="Product image"
                  ></v-img>
                </v-avatar>
                <v-file-input
                  v-model="selectedFile"
                  label="Choose image"
                  accept="image/*"
                  variant="outlined"
                  prepend-icon="mdi-camera"
                  :disabled="isLoading"
                  @change="handleFileSelect"
                ></v-file-input>
              </div>
            </v-card-text>
          </v-card>

          <!-- SEO Settings -->
          <v-card class="dashboard-card pa-6 mb-6">
            <v-card-title class="pb-4">
              <h2 class="text-h6 font-weight-bold">SEO Settings</h2>
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="form.seo_title"
                label="SEO Title"
                variant="outlined"
                :disabled="isLoading"
                class="mb-4"
              ></v-text-field>
              <v-textarea
                v-model="form.seo_description"
                label="SEO Description"
                variant="outlined"
                rows="3"
                :disabled="isLoading"
              ></v-textarea>
            </v-card-text>
          </v-card>

          <!-- Actions -->
          <v-card class="dashboard-card pa-6">
            <v-card-title class="pb-4">
              <h2 class="text-h6 font-weight-bold">Actions</h2>
            </v-card-title>
            <v-card-text>
              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="isLoading"
                :disabled="!valid || isLoading"
                class="mb-3"
              >
                <v-icon left>mdi-content-save</v-icon>
                {{ isEditing ? 'Update Product' : 'Create Product' }}
              </v-btn>
              <v-btn
                variant="outlined"
                size="large"
                block
                @click="$router.go(-1)"
                :disabled="isLoading"
              >
                Cancel
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const form = reactive({
  name: '',
  sku: '',
  category: '',
  price: 0,
  stock_quantity: 0,
  status: 'active',
  description: '',
  weight: null,
  dimensions: '',
  brand: '',
  supplier: '',
  tags: '',
  seo_title: '',
  seo_description: '',
  image: null
})

const valid = ref(false)
const isLoading = ref(false)
const selectedFile = ref(null)
const imagePreview = ref('')
const isEditing = computed(() => !!route.params.id)

const categories = ref([
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Books',
  'Beauty',
  'Automotive',
  'Health',
  'Toys',
  'Food'
])

const statusOptions = ref([
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
])

const nameRules = [
  (v: string) => !!v || 'Product name is required',
  (v: string) => v.length >= 2 || 'Product name must be at least 2 characters',
  (v: string) => v.length <= 100 || 'Product name must be less than 100 characters'
]

const skuRules = [
  (v: string) => !!v || 'SKU is required',
  (v: string) => /^[A-Z0-9-_]+$/.test(v) || 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'
]

const categoryRules = [
  (v: string) => !!v || 'Category is required'
]

const priceRules = [
  (v: number) => v >= 0 || 'Price must be positive',
  (v: number) => v <= 999999.99 || 'Price must be less than 1,000,000'
]

const stockRules = [
  (v: number) => v >= 0 || 'Stock quantity must be positive',
  (v: number) => Number.isInteger(v) || 'Stock quantity must be a whole number'
]

const statusRules = [
  (v: string) => !!v || 'Status is required'
]

const handleFileSelect = (event: any) => {
  const file = event.target?.files?.[0]
  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const loadProduct = async () => {
  if (!isEditing.value) return

  try {
    isLoading.value = true
    const response = await fetch(`/api/products/${route.params.id}`)
    const data = await response.json()

    if (data.success) {
      Object.assign(form, data.data)
      if (data.data.image) {
        imagePreview.value = data.data.image
      }
    }
  } catch (error) {
    console.error('Failed to load product:', error)
    toast.error('Failed to load product')
  } finally {
    isLoading.value = false
  }
}

const saveProduct = async () => {
  try {
    isLoading.value = true

    // Upload image first if selected
    let imageUrl = form.image
    if (selectedFile.value) {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('type', 'product')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadResponse.json()

      if (uploadData.success) {
        imageUrl = uploadData.data.url
      } else {
        throw new Error('Failed to upload image')
      }
    }

    const productData = {
      ...form,
      image: imageUrl,
      tags: form.tags ? form.tags.split(',').map(tag => tag.trim()) : []
    }

    const url = isEditing.value ? `/api/products/${route.params.id}` : '/api/products'
    const method = isEditing.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    })

    const data = await response.json()

    if (data.success) {
      toast.success(`Product ${isEditing.value ? 'updated' : 'created'} successfully!`)
      router.push('/products')
    } else {
      throw new Error(data.message || 'Failed to save product')
    }
  } catch (error: any) {
    console.error('Failed to save product:', error)
    toast.error(error.message || 'Failed to save product')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadProduct()
})
</script>

<style scoped>
.dashboard-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
}
</style>