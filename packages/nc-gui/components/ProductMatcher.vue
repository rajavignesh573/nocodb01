<template>
  <div class="matching-products-page">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - Matching Products -->
      <div class="left-panel">
        <div class="panel-header">
          <h2 class="panel-title">Matching Products ({{ filteredProducts.length }})</h2>
        </div>
        
        <div class="filters-section">
          <div class="filter-row">
            <a-select v-model:value="filters.brand" placeholder="Brand" class="filter-select">
              <a-select-option value="">All Brands</a-select-option>
              <a-select-option value="uppababy">UPPAbaby</a-select-option>
              <a-select-option value="bugababy">Bugababy</a-select-option>
            </a-select>
            
            <a-select v-model:value="filters.category" placeholder="Category" class="filter-select">
              <a-select-option value="">All Categories</a-select-option>
              <a-select-option value="strollers">Strollers</a-select-option>
              <a-select-option value="car-seats">Car Seats</a-select-option>
            </a-select>
            
            <a-select v-model:value="filters.source" placeholder="Source" class="filter-select">
              <a-select-option value="">All Sources</a-select-option>
              <a-select-option value="amazon">Amazon</a-select-option>
              <a-select-option value="target">Target</a-select-option>
            </a-select>
            
            <a-select v-model:value="filters.status" placeholder="Status" class="filter-select">
              <a-select-option value="">All Status</a-select-option>
              <a-select-option value="active">Active</a-select-option>
              <a-select-option value="pending">Pending</a-select-option>
            </a-select>
            
            <a-select v-model:value="filters.orderBy" placeholder="Order by" class="filter-select">
              <a-select-option value="score">Score</a-select-option>
              <a-select-option value="price">Price</a-select-option>
              <a-select-option value="name">Name</a-select-option>
            </a-select>
          </div>
          
          <div class="search-container">
            <a-input-search
              v-model:value="filters.search"
              placeholder="Search products..."
              class="search-input"
              @search="handleSearch"
            >
              <template #prefix>
                <GeneralIcon icon="search" class="h-4 w-4" />
              </template>
            </a-input-search>
          </div>
        </div>
        
        <div class="products-list">
          <div v-if="loading" class="loading-state">
            <a-spin size="large" />
            <p>Loading products...</p>
          </div>
          
          <div v-else-if="error" class="error-state">
            <p>Error loading products: {{ error }}</p>
            <a-button @click="loadProducts">Retry</a-button>
          </div>
          
          <div v-else-if="filteredProducts.length === 0" class="empty-state">
            <p>No products found</p>
            <a-button @click="loadMockData">Load Demo Data</a-button>
          </div>
          
          <div v-else>
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              :class="[
                'product-item',
                selectedProduct?.id === product.id ? 'product-item-selected' : ''
              ]"
              @click="selectProduct(product)"
            >
              <div class="product-image">
                <img 
                  :src="product.media?.[0]?.url || 'https://via.placeholder.com/60x60'" 
                  :alt="product.title" 
                />
              </div>
              <div class="product-details">
                <h4 class="product-name">{{ product.title }}</h4>
                <div class="product-meta">
                  <span class="product-brand">{{ product.brand || 'Unknown Brand' }}</span>
                  <span class="product-price">{{ formatPrice(product.price) }}</span>
                </div>
              </div>
              <div class="product-status">
                <div class="status-indicator active"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Panel - Select Options -->
      <div class="right-panel">
        <div class="panel-header">
          <h2 class="panel-title">Select one option ({{ productSelectionOptions.length }})</h2>
          <button class="no-option-btn" @click="handleNoOption">No Option</button>
        </div>
        
        <div class="product-pairs">
          <div v-if="!selectedProduct" class="no-selection">
            <p>Select a product to view matching options</p>
          </div>
          
          <div v-else-if="productSelectionOptions.length === 0" class="no-options">
            <p>No matching options found for this product</p>
            <a-button @click="loadMockCandidates">Load Demo Candidates</a-button>
          </div>
          
          <div v-else>
            <div
              v-for="option in productSelectionOptions"
              :key="option.id"
              :class="[
                'product-pair',
                option.selected ? 'product-pair-selected' : ''
              ]"
              @click="selectOption(option)"
            >
              <div class="pair-row">
                <div class="product-card">
                  <div class="product-image-large">
                    <img 
                      :src="option.leftProduct.media?.[0]?.url || 'https://via.placeholder.com/120x80'" 
                      :alt="option.leftProduct.title" 
                    />
                  </div>
                  <div class="product-info">
                    <h4 class="product-name">{{ option.leftProduct.title }}</h4>
                    <p class="product-brand">{{ option.leftProduct.brand || 'Unknown Brand' }}</p>
                    <p class="product-sku">{{ option.leftProduct.gtin || 'No SKU' }}</p>
                    <p class="product-price">{{ formatPrice(option.leftProduct.price) }}</p>
                  </div>
                </div>
                
                <div class="product-card">
                  <div class="product-image-large">
                    <img 
                      :src="option.rightProduct.image || 'https://via.placeholder.com/120x80'" 
                      :alt="option.rightProduct.title" 
                    />
                  </div>
                  <div class="product-info">
                    <h4 class="product-name">{{ option.rightProduct.title }}</h4>
                    <p class="product-brand">{{ option.rightProduct.brand || 'Unknown Brand' }}</p>
                    <p class="product-source">{{ option.rightProduct.source.name }}</p>
                    <p class="product-price">{{ formatPrice(option.rightProduct.price) }}</p>
                    <div class="match-score">
                      <span class="score-badge">{{ option.score }}% match</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="pair-actions">
                <a-button 
                  type="primary" 
                  size="small"
                  @click.stop="confirmMatch(option.id)"
                  :disabled="option.selected"
                >
                  {{ option.selected ? 'Confirmed' : 'Confirm Match' }}
                </a-button>
                <a-button 
                  size="small"
                  @click.stop="rejectMatch(option.id)"
                >
                  Reject
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useProductMatching, formatPrice } from '~/composables/useProductMatching'
import type { Product, ExternalProduct } from '~/composables/useProductMatchingApi'

// Use the product matching composable
const {
  products,
  selectedProduct,
  candidates,
  matches,
  filters,
  filteredProducts,
  productSelectionOptions,
  loadProducts,
  loadCandidates,
  loadMatches,
  selectProduct,
  confirmMatch,
  rejectMatch,
  initialize,
  loading,
  error
} = useProductMatching()

// Mock data for development/testing
const mockProducts: Product[] = [
  {
    id: '1',
    title: 'UPPAbaby VISTA V2 Stroller',
    brand: 'UPPAbaby',
    price: 969.99,
    gtin: '1234567890123',
    media: [{ url: 'https://via.placeholder.com/60x60' }]
  },
  {
    id: '2',
    title: 'Bugaboo Fox 3 Stroller',
    brand: 'Bugaboo',
    price: 899.99,
    gtin: '1234567890124',
    media: [{ url: 'https://via.placeholder.com/60x60' }]
  },
  {
    id: '3',
    title: 'Nuna MIXX Next Stroller',
    brand: 'Nuna',
    price: 799.99,
    gtin: '1234567890125',
    media: [{ url: 'https://via.placeholder.com/60x60' }]
  }
]

const mockCandidates: ExternalProduct[] = [
  {
    external_product_key: 'ext-1',
    source: {
      id: '1',
      code: 'amazon',
      name: 'Amazon'
    },
    title: 'Similar UPPAbaby Stroller',
    brand: 'UPPAbaby',
    price: 949.99,
    image: 'https://via.placeholder.com/120x80',
    score: 95,
    explanations: {
      name: 90,
      brand: 100,
      category: 85,
      price: 95
    }
  },
  {
    external_product_key: 'ext-2',
    source: {
      id: '2',
      code: 'target',
      name: 'Target'
    },
    title: 'Alternative Stroller Option',
    brand: 'Graco',
    price: 699.99,
    image: 'https://via.placeholder.com/120x80',
    score: 82,
    explanations: {
      name: 75,
      brand: 60,
      category: 90,
      price: 85
    }
  }
]

// Methods
const handleSearch = (value: string) => {
  filters.value.search = value
}

const selectOption = (option: any) => {
  // This would handle selecting an option for comparison
  console.log('Selected option:', option)
}

const handleNoOption = () => {
  message.info('No option selected')
}

const loadMockData = () => {
  // This would load mock data for demonstration
  message.success('Demo data loaded')
}

const loadMockCandidates = () => {
  // This would load mock candidates for demonstration
  message.success('Demo candidates loaded')
}

// Lifecycle
onMounted(async () => {
  try {
    await initialize()
    message.success('Product Matcher loaded successfully')
  } catch (err) {
    message.error('Failed to load Product Matcher - using demo mode')
    console.error('Product Matcher initialization error:', err)
  }
})
</script>

<style lang="scss" scoped>
.matching-products-page {
  @apply flex flex-col h-full bg-white;
}

/* Main Content Area */
.main-content {
  @apply flex flex-1 overflow-hidden;
}

/* Left Panel */
.left-panel {
  @apply w-96 bg-white border-r border-gray-200 flex flex-col;
}

.panel-header {
  @apply p-4 border-b border-gray-200 bg-white;
}

.panel-title {
  @apply text-lg font-semibold text-gray-900;
}

.filters-section {
  @apply p-4 bg-white border-b border-gray-200;
}

.filter-row {
  @apply flex gap-2 mb-3;
}

.filter-select {
  @apply flex-1;
}

.search-container {
  @apply w-full;
}

.search-input {
  @apply w-full;
}

.products-list {
  @apply flex-1 overflow-y-auto p-2;
}

.loading-state,
.error-state,
.empty-state,
.no-selection,
.no-options {
  @apply flex flex-col items-center justify-center h-64 text-gray-500;
}

.product-item {
  @apply flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mb-2;
  
  &.product-item-selected {
    @apply bg-green-50 border border-green-200;
  }
}

.product-image {
  @apply w-12 h-12 rounded-lg overflow-hidden flex-shrink-0;
  
  img {
    @apply w-full h-full object-cover;
  }
}

.product-details {
  @apply flex-1 min-w-0;
}

.product-name {
  @apply text-sm font-medium text-gray-900 truncate;
}

.product-meta {
  @apply flex items-center gap-2 mt-1;
}

.product-brand {
  @apply text-xs text-gray-600;
}

.product-price {
  @apply text-xs text-gray-600;
}

.product-status {
  @apply flex items-center;
}

.status-indicator {
  @apply w-3 h-3 rounded-full;
  
  &.active {
    @apply bg-green-500;
  }
  
  &.pending {
    @apply bg-orange-500;
  }
}

/* Right Panel */
.right-panel {
  @apply flex-1 flex flex-col bg-white;
}

.right-panel .panel-header {
  @apply flex justify-between items-center;
}

.no-option-btn {
  @apply px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors;
}

.product-pairs {
  @apply flex-1 overflow-y-auto p-4;
}

.product-pair {
  @apply mb-6 border border-gray-200 rounded-lg p-4;
  
  &.product-pair-selected {
    @apply border-green-300 bg-green-50;
  }
}

.pair-row {
  @apply flex gap-4 mb-4;
}

.product-card {
  @apply flex-1 bg-white border border-gray-200 rounded-lg p-4;
}

.product-image-large {
  @apply w-full h-24 rounded-lg overflow-hidden mb-3;
  
  img {
    @apply w-full h-full object-cover;
  }
}

.product-info {
  @apply p-3 rounded-lg;
}

.product-info .product-name {
  @apply text-sm font-medium text-gray-900 mb-1;
}

.product-brand {
  @apply text-xs text-gray-600 mb-1;
}

.product-source {
  @apply text-xs text-blue-600 mb-1;
}

.product-sku {
  @apply text-xs text-gray-500 mb-1;
}

.product-info .product-price {
  @apply text-sm font-semibold text-gray-900;
}

.match-score {
  @apply mt-2;
  
  .score-badge {
    @apply text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded;
  }
}

.pair-actions {
  @apply flex gap-2 justify-end;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .left-panel {
    @apply w-80;
  }
  
  .filter-row {
    @apply flex-col gap-2;
  }
}

@media (max-width: 768px) {
  .main-content {
    @apply flex-col;
  }
  
  .left-panel {
    @apply w-full h-64;
  }
}
</style>
