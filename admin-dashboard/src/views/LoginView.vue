<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="6" xl="4">
        <v-card class="admin-form pa-4 pa-sm-6 pa-md-8 modern-card" elevation="0">
          <v-card-title class="text-center mb-6">
            <div class="d-flex align-center justify-center mb-4">
              <v-avatar width="200" height="100" class="mr-3 logo-glow" tile>
                <v-img src="/photo_5776284057808342202_y.jpg" alt="Hongfa Logo" class="logo-image" cover></v-img>
              </v-avatar>
            </div>
            <h1 class="text-h4 text-sm-h3 font-weight-bold text-center">Hongfa Admin</h1>
            <p class="text-body-1 text-body-2-sm-and-up text-medium-emphasis mt-2 text-center">
              Sign in to your account
            </p>
          </v-card-title>

          <v-card-text>
            <v-form v-model="valid" @submit.prevent="login">
              <v-text-field
                v-model="form.email"
                label="Email Address"
                type="email"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                :rules="emailRules"
                required
                class="mb-3 mb-sm-4"
                :disabled="isLoading"
                placeholder="Enter your email"
                density="comfortable"
              ></v-text-field>

              <v-text-field
                v-model="form.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                :rules="passwordRules"
                required
                class="mb-2 mb-sm-3"
                :disabled="isLoading"
                placeholder="Enter your password"
                density="comfortable"
                @click:append-inner="showPassword = !showPassword"
                @keyup.enter="login"
              ></v-text-field>

              <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between mb-4 mb-sm-6">
                <v-checkbox
                  v-model="rememberMe"
                  label="Remember me"
                  density="compact"
                  class="mt-0 mb-2 mb-sm-0"
                  hide-details
                ></v-checkbox>
                <v-btn
                  variant="text"
                  size="small"
                  color="primary"
                  class="pa-0 align-self-start align-self-sm-center"
                >
                  Forgot password?
                </v-btn>
              </div>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="isLoading"
                :disabled="!valid || isLoading"
                class="mb-4 modern-btn"
                elevation="0"
              >
                <v-icon left class="btn-icon">mdi-login</v-icon>
                <span class="btn-text">Sign In to Dashboard</span>
                <v-icon right class="btn-arrow" size="20">mdi-chevron-right</v-icon>
              </v-btn>
            </v-form>

            <v-divider class="my-6"></v-divider>

            <div class="demo-credentials">
              <h4 class="text-h6 mb-3 text-center">Demo Credentials</h4>
              <v-alert
                type="info"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                <div class="text-body-2 text-center">
                  <strong>Email:</strong> admin@hongfagmbh.de<br>
                  <strong>Password:</strong> admin123
                </div>
              </v-alert>
            </div>

            <!-- Additional Features -->
            <v-row class="mt-4 mt-sm-6">
              <v-col cols="12" class="text-center">
                <v-chip-group class="justify-center">
                  <v-chip size="small" color="success" variant="outlined" class="ma-1">
                    <v-icon start size="16">mdi-shield-check</v-icon>
                    Secure Login
                  </v-chip>
                  <v-chip size="small" color="info" variant="outlined" class="ma-1">
                    <v-icon start size="16">mdi-lock</v-icon>
                    Encrypted
                  </v-chip>
                </v-chip-group>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Modern Background Graphics -->
        <div class="background-decoration">
          <div class="floating-shape shape-1"></div>
          <div class="floating-shape shape-2"></div>
          <div class="floating-shape shape-3"></div>
          <div class="floating-shape shape-4"></div>
          <div class="floating-shape shape-5"></div>
          <div class="floating-shape shape-6"></div>
        </div>

        <!-- Animated particles -->
        <div class="particles">
          <div class="particle particle-1"></div>
          <div class="particle particle-2"></div>
          <div class="particle particle-3"></div>
          <div class="particle particle-4"></div>
          <div class="particle particle-5"></div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: ''
})

const valid = ref(false)
const isLoading = computed(() => authStore.isLoading)
const showPassword = ref(false)
const rememberMe = ref(false)

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 6 || 'Password must be at least 6 characters'
]

const login = async () => {
  const success = await authStore.login(form.email, form.password)
  if (success) {
    router.push('/')
  }
}
</script>

<style scoped>
/* Modern Background Graphics */
.background-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.06));
  backdrop-filter: blur(40px);
  animation: modernFloat 8s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: -5%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 30%;
  right: -3%;
  animation-delay: 2s;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.06));
}

.shape-3 {
  width: 100px;
  height: 100px;
  top: 60%;
  left: 10%;
  animation-delay: 4s;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.06));
}

.shape-4 {
  width: 180px;
  height: 180px;
  bottom: 20%;
  right: 15%;
  animation-delay: 1s;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(16, 185, 129, 0.06));
}

.shape-5 {
  width: 120px;
  height: 120px;
  bottom: 40%;
  left: -2%;
  animation-delay: 3s;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.06));
}

.shape-6 {
  width: 90px;
  height: 90px;
  top: 70%;
  right: -1%;
  animation-delay: 5s;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.06));
}

@keyframes modernFloat {
  0%, 100% {
    transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
    opacity: 0.6;
  }
  25% {
    transform: translateY(-30px) translateX(20px) scale(1.1) rotate(90deg);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-15px) translateX(-10px) scale(0.9) rotate(180deg);
    opacity: 0.4;
  }
  75% {
    transform: translateY(-40px) translateX(-20px) scale(1.05) rotate(270deg);
    opacity: 0.7;
  }
}

/* Animated Particles */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  animation: particleFloat 10s linear infinite;
}

.particle-1 {
  top: 20%;
  left: 10%;
  animation-delay: 0s;
  animation-duration: 8s;
}

.particle-2 {
  top: 40%;
  right: 20%;
  animation-delay: 2s;
  animation-duration: 12s;
  background: rgba(16, 185, 129, 0.3);
}

.particle-3 {
  bottom: 30%;
  left: 30%;
  animation-delay: 4s;
  animation-duration: 10s;
  background: rgba(245, 158, 11, 0.3);
}

.particle-4 {
  top: 60%;
  right: 5%;
  animation-delay: 1s;
  animation-duration: 9s;
  background: rgba(139, 92, 246, 0.3);
}

.particle-5 {
  bottom: 20%;
  left: 70%;
  animation-delay: 3s;
  animation-duration: 11s;
  background: rgba(239, 68, 68, 0.3);
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) translateX(0px);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) translateX(100px);
    opacity: 0;
  }
}

/* Modern Card Styling */
.modern-card {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Logo Effects */
.logo-glow {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.logo-glow:hover {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
  transform: scale(1.05);
}

.logo-image {
  transition: all 0.3s ease;
}

.logo-image:hover {
  filter: brightness(1.1) contrast(1.1);
}

/* Modern Button */
.modern-btn {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
}

.modern-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.modern-btn:hover::before {
  left: 100%;
}

.modern-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-icon, .btn-text, .btn-arrow {
  transition: all 0.3s ease;
}

.modern-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* Enhanced Form Fields */
.v-text-field .v-field {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.v-text-field .v-field:focus-within {
  box-shadow: none !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
  background: rgba(59, 130, 246, 0.02);
}

.v-text-field .v-field:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.v-text-field .v-field__outline {
  display: none !important;
}

/* Loading Animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.modern-btn .v-btn__loader {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive Enhancements */
@media (max-width: 600px) {
  .floating-shape {
    display: none; /* Reduce animations on mobile for performance */
  }

  .particles {
    display: none;
  }

  .modern-card {
    margin: 16px;
    backdrop-filter: blur(10px);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .floating-shape,
  .particle,
  .modern-btn,
  .logo-glow {
    animation: none;
    transition: none;
  }
}
</style>