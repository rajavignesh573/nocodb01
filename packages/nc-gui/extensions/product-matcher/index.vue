<template>
  <div class="product-matcher-extension">
    <div class="extension-content">
      <div class="extension-header">
        <h2>Product Matcher</h2>
        <p>Navigate to the Product Matcher page to start matching products</p>
      </div>
      <div class="extension-actions">
        <NcButton type="primary" @click="navigateToProductMatcher">
          Open Product Matcher
        </NcButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const workspaceStore = useWorkspace()
const { navigateToProductMatcher } = workspaceStore

onMounted(() => {
  // Automatically navigate to the product matcher page when extension is opened
  navigateToProductMatcher()
})
</script>

<style lang="scss" scoped>
.product-matcher-extension {
  @apply p-6;
}

.extension-content {
  @apply text-center;
}

.extension-header {
  @apply mb-6;
}

.extension-header h2 {
  @apply text-xl font-semibold text-gray-900 mb-2;
}

.extension-header p {
  @apply text-gray-600;
}

.extension-actions {
  @apply flex justify-center;
}
</style>
