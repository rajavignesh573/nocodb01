<script lang="ts" setup>
import { useTitle } from '@vueuse/core'
import { useProductMatching, formatPrice } from '~/extensions/product-matcher/composables/useProductMatching'

const { isUIAllowed } = useRoles()

const { hideSidebar, isNewSidebarEnabled } = storeToRefs(useSidebarStore())

const workspaceStore = useWorkspace()

const { loadRoles } = useRoles()
const { activeWorkspace: _activeWorkspace } = storeToRefs(workspaceStore)
const { loadCollaborators } = workspaceStore

const currentWorkspace = computedAsync(async () => {
  await loadRoles(undefined, {}, _activeWorkspace.value?.id)
  return _activeWorkspace.value
})

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

// Initialize the product matching system
onMounted(async () => {
  await initialize()
})

// Handle product selection
const handleProductSelection = async (product: any) => {
  await selectProduct(product)
}

// Handle option selection
const handleOptionSelection = async (optionId: string) => {
  await confirmMatch(optionId)
}

// Handle option rejection
const handleOptionRejection = async (optionId: string) => {
  await rejectMatch(optionId)
}

watch(
  () => currentWorkspace.value?.title,
  (title) => {
    if (!title) return

    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)

    useTitle(capitalizedTitle)
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  if (isNewSidebarEnabled.value) {
    hideSidebar.value = true
  }

  until(() => currentWorkspace.value?.id)
    .toMatch((v) => !!v)
    .then(async () => {
      await loadCollaborators({ includeDeleted: true }, currentWorkspace.value!.id)
    })
})

onBeforeMount(() => {
  hideSidebar.value = false
})

watch(
  () => currentWorkspace.value?.title,
  (title) => {
    if (!title) return

    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)

    useTitle(capitalizedTitle)
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  if (isNewSidebarEnabled.value) {
    hideSidebar.value = true
  }

  until(() => currentWorkspace.value?.id)
    .toMatch((v) => !!v)
    .then(async () => {
      await loadCollaborators({ includeDeleted: true }, currentWorkspace.value!.id)
    })
})

onBeforeMount(() => {
  hideSidebar.value = false
})
</script>

<template>
  <div v-if="currentWorkspace" class="flex w-full flex-col nc-workspace-product">
    <div class="flex gap-2 items-center min-w-0 p-2 h-[var(--topbar-height)] border-b-1 border-gray-200">
      <GeneralOpenLeftSidebarBtn v-if="!isNewSidebarEnabled" />

      <div class="flex-1 nc-breadcrumb nc-no-negative-margin pl-1">
        <div class="nc-breadcrumb-item capitalize">
          {{ currentWorkspace?.title }}
        </div>
        <GeneralIcon icon="ncSlash1" class="nc-breadcrumb-divider" />
        <h1 class="nc-breadcrumb-item active">
          {{ $t('general.product') }}
        </h1>
      </div>

      <SmartsheetTopbarCmdK v-if="!isNewSidebarEnabled" />
    </div>
    
    <div class="flex-1 flex overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <a-spin size="large" />
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <div class="text-gray-600 mb-4">{{ error }}</div>
          <a-button type="primary" @click="initialize">Retry</a-button>
        </div>
      </div>
      
      <!-- Main Content -->
      <template v-else>
        <!-- Left Panel: Matching Products -->
        <div class="w-36/100 border-r border-gray-200 bg-gray-50 flex flex-col h-full overflow-hidden">
          <div class="p-6 border-b border-gray-100 bg-white flex-shrink-0">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">
                Matching Products
                <span class="text-gray-500 font-normal ml-2">({{ filteredProducts.length }})</span>
              </h2>
            </div>
            
            <!-- Professional Filters Section -->
            <div class="space-y-4">
              <!-- First Row of Filters -->
              <div class="grid grid-cols-4 gap-4">
                <a-select v-model:value="filters.brand" placeholder="Brand" size="middle" class="filter-select">
                  <a-select-option value="">All Brands</a-select-option>
                  <a-select-option value="UPPAbaby">UPPAbaby</a-select-option>
                  <a-select-option value="Bugaboo">Bugaboo</a-select-option>
                  <a-select-option value="Nuna">Nuna</a-select-option>
                  <a-select-option value="Cybex">Cybex</a-select-option>
                  <a-select-option value="Thule">Thule</a-select-option>
                </a-select>
                
                <a-select v-model:value="filters.category" placeholder="Category" size="middle" class="filter-select">
                  <a-select-option value="">All Categories</a-select-option>
                  <a-select-option value="strollers">Strollers</a-select-option>
                  <a-select-option value="car-seats">Car Seats</a-select-option>
                  <a-select-option value="travel-systems">Travel Systems</a-select-option>
                </a-select>
                
                <a-select v-model:value="filters.source" placeholder="Source" size="middle" class="filter-select">
                  <a-select-option value="">All Sources</a-select-option>
                  <a-select-option value="amazon">Amazon</a-select-option>
                  <a-select-option value="walmart">Walmart</a-select-option>
                  <a-select-option value="target">Target</a-select-option>
                </a-select>
                
                <a-select v-model:value="filters.status" placeholder="Status" size="middle" class="filter-select">
                  <a-select-option value="">All Status</a-select-option>
                  <a-select-option value="matched">Matched</a-select-option>
                  <a-select-option value="not_matched">Not Matched</a-select-option>
                  <a-select-option value="pending">Pending</a-select-option>
                </a-select>
              </div>
              
              <!-- Second Row of Filters -->
              <div class="grid grid-cols-3 gap-4">
                <a-select v-model:value="filters.orderBy" placeholder="Order by" size="middle" class="filter-select">
                  <a-select-option value="score">Match Score</a-select-option>
                  <a-select-option value="price">Price</a-select-option>
                  <a-select-option value="name">Name</a-select-option>
                </a-select>
                
                <a-input-search 
                  v-model:value="filters.search" 
                  placeholder="Search products..." 
                  size="middle"
                  class="search-input col-span-2"
                  allow-clear
                >
                  <template #prefix>
                    <GeneralIcon icon="search" class="h-4 w-4 text-gray-400" />
                  </template>
                </a-input-search>
              </div>
            </div>
          </div>
          
          <!-- Product List -->
          <div class="flex-1 overflow-y-auto" style="height: 0;">
            <div class="p-6 space-y-3">
              <!-- No Products Found Message -->
              <div v-if="filteredProducts.length === 0" class="text-center py-8">
                <div class="mb-3">
                  <GeneralIcon icon="search" class="h-10 w-10 text-gray-300 mx-auto" />
                </div>
                <h3 class="text-base font-medium text-gray-900 mb-1">No Products Found</h3>
                <p class="text-sm text-gray-500">
                  {{ filters.search ? `No products match "${filters.search}"` : 'No products available in your catalog' }}
                </p>
              </div>

              <!-- Products List -->
              <div
                v-for="product in filteredProducts"
                :key="product.id"
                @click="handleProductSelection(product)"
                :class="[
                  'p-4 rounded-xl cursor-pointer transition-all duration-200 border-2',
                  selectedProduct?.id === product.id
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                ]"
              >
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <img 
                      :src="product.media?.[0]?.url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60&fit=crop&crop=center'" 
                      :alt="product.title"
                      class="w-14 h-14 rounded-lg object-cover bg-gray-100 border border-gray-200"
                      @error="$event.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60&fit=crop&crop=center'"
                    />
                    <div 
                      :class="[
                        'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
                        'bg-emerald-500'
                      ]"
                    ></div>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-sm font-semibold text-gray-900 truncate">
                        {{ product.title }}
                      </h3>
                    </div>
                    
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-medium text-gray-500">Brand</span>
                        <span class="text-sm font-bold text-gray-900">{{ product.brand || 'N/A' }}</span>
                      </div>
                      <span class="text-sm font-semibold text-gray-900">${{ formatPrice(product.price) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Panel: Selection Options -->
        <div class="w-64/100 bg-white">
          <div class="p-6 border-b border-gray-100 bg-white">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900">
                Select one option
                <span class="text-gray-500 font-normal ml-2">({{ productSelectionOptions.length }})</span>
              </h2>
              <a-button type="text" size="middle" class="text-gray-600 hover:text-gray-900">
                No Option
              </a-button>
            </div>
          </div>
          
          <div class="p-6 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            <!-- No Options Found Message -->
            <div v-if="productSelectionOptions.length === 0" class="text-center py-8">
              <div class="mb-3">
                <GeneralIcon icon="link" class="h-10 w-10 text-gray-300 mx-auto" />
              </div>
              <h3 class="text-base font-medium text-gray-900 mb-1">No Matches Found</h3>
              <p class="text-sm text-gray-500">
                {{ selectedProduct 
                  ? `No matching products found for "${selectedProduct.title}"` 
                  : 'Select a product from the left panel to find matches' 
                }}
              </p>
            </div>

            <div
              v-for="option in productSelectionOptions"
              :key="option.id"
              @click="handleOptionSelection(option.id)"
              :class="[
                'p-4 rounded-lg cursor-pointer transition-all duration-200 border',
                option.selected 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              ]"
            >
              <!-- Single Row Layout: [Image 1] [Image 2] [Details 1] [Details 2] -->
              <div class="flex items-center gap-6">
                <!-- Image 1 -->
                <img 
                  :src="option.leftProduct.media?.[0]?.url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=120&fit=crop&crop=center'" 
                  :alt="option.leftProduct.title"
                  class="w-24 h-24 rounded-lg object-cover bg-gray-200 border border-gray-300 flex-shrink-0"
                  @error="$event.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=120&fit=crop&crop=center'"
                />
                
                <!-- Image 2 -->
                <img 
                  :src="option.rightProduct.image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=120&fit=crop&crop=center'" 
                  :alt="option.rightProduct.title"
                  class="w-24 h-24 rounded-lg object-cover bg-gray-200 border border-gray-300 flex-shrink-0"
                  @error="$event.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=120&fit=crop&crop=center'"
                />
                
                <!-- Details 1 - Right Aligned -->
                <div class="flex-1 min-w-0">
                  <div class="space-y-1 text-right">
                    <div class="font-semibold text-gray-900 text-sm leading-tight truncate">{{ option.leftProduct.title }}</div>
                    <div class="text-xs text-gray-600">{{ option.leftProduct.brand || 'N/A' }}</div>
                    <div class="text-xs text-gray-500 font-mono">{{ option.leftProduct.gtin || 'N/A' }}</div>
                    <div class="font-bold text-gray-900 text-base">${{ formatPrice(option.leftProduct.price) }}</div>
                  </div>
                </div>
                
                <!-- Details 2 - Left Aligned -->
                <div class="flex-1 min-w-0">
                  <div class="space-y-1 text-left">
                    <div class="font-semibold text-gray-900 text-sm leading-tight truncate">{{ option.rightProduct.title }}</div>
                    <div class="text-xs text-gray-600">{{ option.rightProduct.brand || 'N/A' }}</div>
                    <div class="text-xs text-gray-500 font-mono">{{ option.rightProduct.gtin || 'N/A' }}</div>
                    <div class="font-bold text-gray-900 text-base">${{ formatPrice(option.rightProduct.price) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nc-workspace-product {
  @apply h-full;
}

// Professional filter styling
.filter-select {
  :deep(.ant-select-selector) {
    border-radius: 8px !important;
    border: 1px solid #e5e7eb !important;
    background-color: #ffffff !important;
    transition: all 0.2s ease;
    height: 40px !important;
    
    &:hover {
      border-color: #d1d5db !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    }
  }
  
  :deep(.ant-select-focused .ant-select-selector) {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }
  
  :deep(.ant-select-selection-placeholder) {
    color: #6b7280;
    font-size: 14px;
    font-weight: 400;
  }
  
  :deep(.ant-select-selection-item) {
    color: #374151;
    font-size: 14px;
    font-weight: 500;
  }
  
  :deep(.ant-select-arrow) {
    color: #6b7280;
  }
}

// Professional search input styling
.search-input {
  :deep(.ant-input-search) {
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    transition: all 0.2s ease;
    height: 40px;
    
    &:hover {
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    &:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }
  
  :deep(.ant-input) {
    border: none;
    background: transparent;
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    font-weight: 400;
    
    &::placeholder {
      color: #6b7280;
      font-weight: 400;
    }
  }
  
  :deep(.ant-input-search-button) {
    border: none;
    background: transparent;
    border-radius: 0 8px 8px 0;
    height: 100%;
    padding: 0 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #f3f4f6;
    }
    
    .anticon {
      color: #6b7280;
    }
  }
  
  :deep(.ant-input-clear-icon) {
    color: #9ca3af;
    
    &:hover {
      color: #6b7280;
    }
  }
}
</style>
