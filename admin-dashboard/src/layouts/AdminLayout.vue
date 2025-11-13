<template>
  <v-app class="admin-layout">
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.display.mdAndUp"
      :temporary="$vuetify.display.smAndDown"
      class="admin-sidebar"
      width="280"
    >
      <v-list density="compact" class="pa-2">
        <!-- Logo -->
        <v-list-item class="mb-4">
          <v-list-item-avatar size="48">
            <v-img src="/logo-placeholder.png" alt="Hongfa Logo"></v-img>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title class="text-h6 font-weight-bold white--text">
              Hongfa Admin
            </v-list-item-title>
            <v-list-item-subtitle class="caption white--text opacity-8">
              Dashboard
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <!-- Navigation Items -->
        <v-list-item
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :active="$route.path === item.path"
          class="admin-nav-item"
          :class="{ 'admin-nav-item--active': $route.path === item.path }"
        >
          <template v-slot:prepend>
            <v-icon :icon="item.icon" size="20"></v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- User Info -->
      <template v-slot:append>
        <v-divider class="mb-2"></v-divider>
        <v-list-item class="mb-2">
          <v-list-item-avatar size="32" class="admin-avatar">
            <v-img :src="user?.avatar || '/default-avatar.png'" alt="User Avatar"></v-img>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title class="text-body-2 white--text">
              {{ user?.firstName }} {{ user?.lastName }}
            </v-list-item-title>
            <v-list-item-subtitle class="caption white--text opacity-7">
              {{ user?.role }}
            </v-list-item-subtitle>
          </v-list-item-content>
          <template v-slot:append>
            <v-btn icon size="small" @click="logout" color="white">
              <v-icon>mdi-logout</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <!-- Header -->
      <v-app-bar
        class="admin-header px-6"
        height="64"
        elevation="0"
      >
        <v-app-bar-nav-icon
          v-if="$vuetify.display.smAndDown"
          @click="drawer = !drawer"
        ></v-app-bar-nav-icon>

        <v-spacer></v-spacer>

        <!-- Notifications -->
        <v-btn icon class="mr-2">
          <v-badge
            :content="notifications.length"
            :value="notifications.length > 0"
            color="error"
            overlap
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>

        <!-- User Menu -->
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props">
              <v-avatar size="32">
                <v-img :src="user?.avatar || '/default-avatar.png'" alt="User Avatar"></v-img>
              </v-avatar>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="$router.push('/settings')">
              <template v-slot:prepend>
                <v-icon>mdi-cog</v-icon>
              </template>
              <v-list-item-title>Settings</v-list-item-title>
            </v-list-item>
            <v-list-item @click="logout">
              <template v-slot:prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>Logout</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-app-bar>

      <!-- Page Content -->
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const drawer = ref(true)
const user = computed(() => authStore.user)
const notifications = computed(() => notificationStore.notifications)

const navItems = [
  { path: '/', title: 'Dashboard', icon: 'mdi-view-dashboard' },
  { path: '/products', title: 'Products', icon: 'mdi-package-variant' },
  { path: '/orders', title: 'Orders', icon: 'mdi-shopping' },
  { path: '/customers', title: 'Customers', icon: 'mdi-account-group' },
  { path: '/users', title: 'Users', icon: 'mdi-account-cog' },
  { path: '/analytics', title: 'Analytics', icon: 'mdi-chart-line' },
  { path: '/inventory', title: 'Inventory', icon: 'mdi-warehouse' },
  { path: '/settings', title: 'Settings', icon: 'mdi-cog' }
]

const logout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onMounted(() => {
  // Initialize notifications
  notificationStore.initialize()
})
</script>

<style scoped>
.admin-layout {
  background: linear-gradient(135deg, #1e293b 0%, #334155 25%, #475569 50%, #64748b 75%, #0f172a 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  position: relative;
  overflow: hidden;
}

.admin-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
  animation: floatingShapes 20s ease-in-out infinite;
}

.admin-sidebar {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 2;
}

.admin-sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(59,130,246,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(59,130,246,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,119,198,0.1)"/><circle cx="10" cy="50" r="0.5" fill="rgba(255,119,198,0.1)"/><circle cx="90" cy="30" r="0.8" fill="rgba(120,219,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.6;
  pointer-events: none;
}

.admin-header {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
}

.admin-nav-item {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  margin: 6px 12px;
  position: relative;
  overflow: hidden;
}

.admin-nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
  transition: left 0.5s ease;
}

.admin-nav-item:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.1) 100%);
  transform: translateX(8px) scale(1.02);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

.admin-nav-item:hover::before {
  left: 100%;
}

.admin-nav-item--active {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  transform: translateX(4px);
}

.admin-nav-item--active::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: white;
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.admin-avatar {
  border: 3px solid linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  position: relative;
  z-index: 1;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes floatingShapes {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
    opacity: 0.6;
  }
  33% {
    transform: translateY(-20px) rotate(120deg) scale(1.1);
    opacity: 0.8;
  }
  66% {
    transform: translateY(10px) rotate(240deg) scale(0.9);
    opacity: 0.4;
  }
}

/* Enhanced logo styling */
.admin-sidebar .v-list-item-avatar {
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.admin-sidebar .v-list-item-avatar::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  border-radius: 14px;
  z-index: -1;
  opacity: 0.8;
}

/* Notification bell enhancement */
.admin-header .v-btn {
  transition: all 0.3s ease;
  border-radius: 12px;
}

.admin-header .v-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: scale(1.05);
}

/* User menu enhancement */
.admin-header .v-menu .v-btn {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.admin-header .v-menu .v-btn:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}
</style>