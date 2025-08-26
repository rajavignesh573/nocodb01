<template>
  <div class="product-matching-page">
    <!-- Use the existing NocoDB product view component -->
    <WorkspaceProductView />
  </div>
</template>

<script setup lang="ts">
import WorkspaceProductView from '~/components/workspace/product/view.vue'

// Page metadata
definePageMeta({
  title: 'Product Matching',
  description: 'Search and compare products with competitor alternatives',
  layout: 'default'
})
</script>

<style lang="scss" scoped>
.product-matching-page {
  @apply h-full;
}
</style>