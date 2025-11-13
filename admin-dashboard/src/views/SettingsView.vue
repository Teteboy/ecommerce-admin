<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">Settings</h1>
            <p class="text-body-1 text-medium-emphasis">
              Configure your admin dashboard and system preferences
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-content-save"
            @click="saveSettings"
            :loading="isSaving"
          >
            Save Changes
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Settings Sidebar -->
      <v-col cols="12" md="3">
        <v-card class="dashboard-card">
          <v-card-text class="pa-0">
            <v-list density="compact">
              <v-list-item
                v-for="section in settingsSections"
                :key="section.key"
                :active="activeSection === section.key"
                @click="activeSection = section.key"
                class="settings-nav-item"
              >
                <template v-slot:prepend>
                  <v-icon :icon="section.icon" size="20"></v-icon>
                </template>
                <v-list-item-title>{{ section.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Settings Content -->
    <v-col cols="12" md="9">
      <!-- General Settings -->
      <v-card v-if="activeSection === 'general'" class="dashboard-card pa-6">
        <v-card-title class="pb-4">
          <h2 class="text-h6 font-weight-bold">General Settings</h2>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="settings.general.siteName"
                label="Site Name"
                variant="outlined"
                hint="The name of your website/store"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="settings.general.siteUrl"
                label="Site URL"
                variant="outlined"
                hint="Your website URL"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="settings.general.contactEmail"
                label="Contact Email"
                type="email"
                variant="outlined"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="settings.general.contactPhone"
                label="Contact Phone"
                variant="outlined"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="settings.general.siteDescription"
                label="Site Description"
                variant="outlined"
                rows="3"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

        <!-- Store Settings -->
        <v-card v-if="activeSection === 'store'" class="dashboard-card pa-6">
          <v-card-title class="pb-4">
            <h2 class="text-h6 font-weight-bold">Store Settings</h2>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="settings.general.currency"
                  :items="currencies"
                  label="Default Currency"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.general.timezone"
                  label="Timezone"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.inventory.weightUnit"
                  label="Weight Unit"
                  variant="outlined"
                  placeholder="kg, lbs, etc."
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.inventory.dimensionUnit"
                  label="Dimension Unit"
                  variant="outlined"
                  placeholder="cm, in, etc."
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.inventory.enableTaxes"
                  label="Enable Tax Calculation"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12" md="6" v-if="settings.inventory.enableTaxes">
                <v-text-field
                  v-model.number="settings.inventory.defaultTaxRate"
                  label="Default Tax Rate (%)"
                  type="number"
                  step="0.01"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Security Settings -->
        <v-card v-if="activeSection === 'security'" class="dashboard-card pa-6">
          <v-card-title class="pb-4">
            <h2 class="text-h6 font-weight-bold">Security Settings</h2>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="settings.security.sessionTimeout"
                  label="Session Timeout (hours)"
                  type="number"
                  variant="outlined"
                  hint="Auto logout after inactivity"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="settings.security.passwordMinLength"
                  label="Minimum Password Length"
                  type="number"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.security.requireSpecialChars"
                  label="Require Special Characters"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.security.requireNumbers"
                  label="Require Numbers"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.security.maxLoginAttempts"
                  label="Limit Login Attempts"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12" md="6" v-if="settings.security.maxLoginAttempts">
                <v-text-field
                  v-model.number="settings.security.maxLoginAttempts"
                  label="Max Login Attempts"
                  type="number"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6" v-if="settings.security.maxLoginAttempts">
                <v-text-field
                  v-model.number="settings.security.lockoutDuration"
                  label="Lockout Duration (minutes)"
                  type="number"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Notification Settings -->
        <v-card v-if="activeSection === 'notifications'" class="dashboard-card pa-6">
          <v-card-title class="pb-4">
            <h2 class="text-h6 font-weight-bold">Notification Settings</h2>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <h3 class="text-subtitle-1 font-weight-bold mb-4">Email Notifications</h3>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.notifications.emailNotifications"
                  label="Email Notifications"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.notifications.lowStockAlerts"
                  label="Low Stock Alerts"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.notifications.orderNotifications"
                  label="Order Notifications"
                  color="primary"
                ></v-switch>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.notifications.errorAlerts"
                  label="Error Alerts"
                  color="primary"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Inventory Settings -->
        <v-card v-if="activeSection === 'inventory'" class="dashboard-card pa-6">
          <v-card-title class="pb-4">
            <h2 class="text-h6 font-weight-bold">Inventory Settings</h2>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="settings.inventory.defaultLowStockThreshold"
                  label="Default Low Stock Threshold"
                  type="number"
                  variant="outlined"
                  hint="Alert when stock falls below this number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="settings.inventory.reorderPoint"
                  label="Reorder Point"
                  type="number"
                  variant="outlined"
                  hint="Automatically reorder when stock reaches this level"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.inventory.autoReorderEnabled"
                  label="Enable Auto Reorder"
                  color="primary"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Orders Settings -->
        <v-card v-if="activeSection === 'orders'" class="dashboard-card pa-6">
          <v-card-title class="pb-4">
            <h2 class="text-h6 font-weight-bold">Order Settings</h2>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="settings.orders.defaultStatus"
                  :items="orderStatuses"
                  label="Default Order Status"
                  variant="outlined"
                  hint="Status assigned to new orders"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.orders.autoFulfillDigital"
                  label="Auto-fulfill Digital Products"
                  color="primary"
                  hint="Automatically mark digital products as fulfilled"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="settings.orders.requireShippingAddress"
                  label="Require Shipping Address"
                  color="primary"
                  hint="Require shipping address for all orders"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const isSaving = ref(false)
const activeSection = ref('general')

const settings = reactive({
  general: {
    siteName: 'Hongfa Admin',
    siteUrl: 'https://hongfagmbh.de',
    contactEmail: 'info@hongfagmbh.de',
    contactPhone: '+49 123 456 789',
    siteDescription: 'Admin dashboard for Hongfa Factory Germany GmbH',
    timezone: 'Europe/Berlin',
    language: 'en',
    currency: 'EUR',
    weightUnit: 'kg',
    dimensionUnit: 'cm',
    enableTaxes: true,
    defaultTaxRate: 19
  },
  security: {
    sessionTimeout: 24,
    passwordMinLength: 6,
    requireSpecialChars: false,
    requireNumbers: false,
    maxLoginAttempts: 5,
    lockoutDuration: 30
  },
  notifications: {
    emailNotifications: true,
    lowStockAlerts: true,
    orderNotifications: true,
    errorAlerts: true
  },
  inventory: {
    defaultLowStockThreshold: 10,
    autoReorderEnabled: false,
    reorderPoint: 5,
    weightUnit: 'kg',
    dimensionUnit: 'cm',
    enableTaxes: true,
    defaultTaxRate: 19
  },
  orders: {
    defaultStatus: 'pending',
    autoFulfillDigital: true,
    requireShippingAddress: true
  }
})

const settingsSections = ref([
  { key: 'general', title: 'General', icon: 'mdi-cog' },
  { key: 'store', title: 'Store', icon: 'mdi-store' },
  { key: 'security', title: 'Security', icon: 'mdi-shield' },
  { key: 'notifications', title: 'Notifications', icon: 'mdi-bell' },
  { key: 'inventory', title: 'Inventory', icon: 'mdi-package-variant' },
  { key: 'orders', title: 'Orders', icon: 'mdi-cart' }
])

const currencies = ref([
  { title: 'Euro (€)', value: 'EUR' },
  { title: 'US Dollar ($)', value: 'USD' },
  { title: 'British Pound (£)', value: 'GBP' }
])

const orderStatuses = ref([
  { title: 'Pending', value: 'pending' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Processing', value: 'processing' },
  { title: 'Shipped', value: 'shipped' }
])

const saveSettings = async () => {
  try {
    isSaving.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(settings)
    })

    const data = await response.json()

    if (data.success) {
      toast.success('Settings saved successfully!')
    } else {
      throw new Error(data.message)
    }
  } catch (error: any) {
    console.error('Failed to save settings:', error)
    toast.error(error.message || 'Failed to save settings')
  } finally {
    isSaving.value = false
  }
}

const toggleBrowserNotifications = async () => {
  // Placeholder for future browser notification implementation
  console.log('Browser notifications toggled')
}

const loadSettings = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/settings', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    if (data.success) {
      Object.assign(settings, data.data)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-nav-item {
  transition: all 0.3s ease;
  border-radius: 8px;
  margin: 4px 8px;
}

.settings-nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.settings-nav-item--active {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  font-weight: 600;
}
</style>