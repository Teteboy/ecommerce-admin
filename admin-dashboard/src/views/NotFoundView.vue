<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="6" lg="4" class="text-center">
        <v-card class="dashboard-card pa-8" elevation="8">
          <v-card-text>
            <!-- 404 Illustration -->
            <div class="mb-6">
              <v-icon size="120" color="primary" class="mb-4">mdi-file-search</v-icon>
              <h1 class="text-h2 font-weight-bold text-primary mb-2">404</h1>
              <h2 class="text-h5 font-weight-medium mb-4">Page Not Found</h2>
              <p class="text-body-1 text-medium-emphasis mb-6">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <!-- Actions -->
            <v-row class="mb-4">
              <v-col cols="12" class="mb-2">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  to="/"
                  prepend-icon="mdi-home"
                >
                  Go to Dashboard
                </v-btn>
              </v-col>
              <v-col cols="12">
                <v-btn
                  variant="outlined"
                  size="large"
                  block
                  @click="$router.go(-1)"
                  prepend-icon="mdi-arrow-left"
                >
                  Go Back
                </v-btn>
              </v-col>
            </v-row>

            <!-- Quick Links -->
            <v-divider class="my-6"></v-divider>
            <div class="text-left">
              <h3 class="text-subtitle-1 font-weight-bold mb-4">Quick Links</h3>
              <v-row dense>
                <v-col cols="6">
                  <v-btn
                    variant="text"
                    size="small"
                    to="/products"
                    class="justify-start pa-2"
                    block
                  >
                    <v-icon size="16" class="mr-2">mdi-package-variant</v-icon>
                    Products
                  </v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn
                    variant="text"
                    size="small"
                    to="/orders"
                    class="justify-start pa-2"
                    block
                  >
                    <v-icon size="16" class="mr-2">mdi-shopping</v-icon>
                    Orders
                  </v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn
                    variant="text"
                    size="small"
                    to="/customers"
                    class="justify-start pa-2"
                    block
                  >
                    <v-icon size="16" class="mr-2">mdi-account-group</v-icon>
                    Customers
                  </v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn
                    variant="text"
                    size="small"
                    to="/analytics"
                    class="justify-start pa-2"
                    block
                  >
                    <v-icon size="16" class="mr-2">mdi-chart-line</v-icon>
                    Analytics
                  </v-btn>
                </v-col>
              </v-row>
            </div>

            <!-- Help Text -->
            <v-divider class="my-6"></v-divider>
            <div class="text-center">
              <p class="text-caption text-medium-emphasis mb-2">
                If you believe this is an error, please contact support.
              </p>
              <v-btn
                variant="text"
                size="small"
                color="primary"
                href="mailto:support@hongfagmbh.de"
              >
                Contact Support
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Background decoration -->
        <div class="background-decoration">
          <div class="circle circle-1"></div>
          <div class="circle circle-2"></div>
          <div class="circle circle-3"></div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// No script needed for this simple component
</script>

<style scoped>
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

.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: -5%;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 60%;
  right: -5%;
  animation-delay: 2s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  left: 50%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.dashboard-card {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.2);
}
</style>