<script lang="ts" setup>
import { useTitle } from '@vueuse/core'
import { ref } from 'vue'
import { useChat } from '~/composables/useChat'

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

// Use the chat composable
const {
  messages,
  conversations,
  currentConversationId,
  isLoading,
  error,
  canSendMessage,
  sendMessage,
  loadConversations,
  loadConversation,
  deleteConversation,
  clearMessages,
  healthCheck
} = useChat()

// Local state for input
const inputMessage = ref('')

// Mock product data to match the image
const products = ref([
  {
    id: 1,
    name: 'UPPAbaby VISTA V2 Stroller',
    percentage: '95%',
    price: '$969.99',
    status: 'active',
    image: 'https://via.placeholder.com/60x60'
  },
  {
    id: 2,
    name: 'Bugaboo Fox 3 Stroller',
    percentage: '92%',
    price: '$899.99',
    status: 'active',
    image: 'https://via.placeholder.com/60x60',
    selected: true
  },
  {
    id: 3,
    name: 'Nuna MIXX Next Stroller',
    percentage: '88%',
    price: '$799.99',
    status: 'pending',
    image: 'https://via.placeholder.com/60x60'
  },
  {
    id: 4,
    name: 'Cybex Gazelle S Stroller',
    percentage: '85%',
    price: '$699.99',
    status: 'active',
    image: 'https://via.placeholder.com/60x60'
  },
  {
    id: 5,
    name: 'Thule Spring Stroller',
    percentage: '82%',
    price: '$599.99',
    status: 'active',
    image: 'https://via.placeholder.com/60x60'
  },
  {
    id: 6,
    name: 'Babyzen YOYO2 Stroller',
    percentage: '78%',
    price: '$499.99',
    status: 'pending',
    image: 'https://via.placeholder.com/60x60'
  }
])

const productPairs = ref([
  {
    id: 1,
    left: {
      name: 'Graco Modes Pramette Stroller',
      color: 'Blue',
      sku: '8717447138327',
      price: '299.99',
      image: 'https://via.placeholder.com/120x80'
    },
    right: {
      name: 'Cybex Gazelle S Stroller',
      color: 'Blue',
      sku: '8717447138327',
      price: '299.99',
      image: 'https://via.placeholder.com/120x80'
    }
  },
  {
    id: 2,
    left: {
      name: 'Chicco Bravo Trio Travel System',
      color: 'Black',
      sku: '4058511661445',
      price: '399.99',
      image: 'https://via.placeholder.com/120x80'
    },
    right: {
      name: 'Cybex Gazelle S Stroller',
      color: 'Black',
      sku: '4058511661445',
      price: '399.99',
      image: 'https://via.placeholder.com/120x80'
    }
  },
  {
    id: 3,
    left: {
      name: 'Evenflo Pivot Xpand Modular Travel System',
      color: 'Gray',
      sku: '817609018467',
      price: '369.99',
      image: 'https://via.placeholder.com/120x80'
    },
    right: {
      name: 'Cybex Gazelle S Stroller',
      color: 'Gray',
      sku: '817609018467',
      price: '369.99',
      image: 'https://via.placeholder.com/120x80'
    },
    selected: true
  }
])

// Methods
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || !canSendMessage.value) return
  
  const message = inputMessage.value.trim()
  inputMessage.value = ''
  await sendMessage(message)
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

const handleNewConversation = () => {
  clearMessages()
}

const handleSelectConversation = async (conversationId: string) => {
  await loadConversation(conversationId)
}

const handleDeleteConversation = async (conversationId: string) => {
  await deleteConversation(conversationId)
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

onMounted(async () => {
  if (isNewSidebarEnabled.value) {
    hideSidebar.value = true
  }

  until(() => currentWorkspace.value?.id)
    .toMatch((v) => !!v)
    .then(async () => {
      await loadCollaborators({ includeDeleted: true }, currentWorkspace.value!.id)
      await loadConversations()
      await healthCheck()
    })
})

onBeforeMount(() => {
  hideSidebar.value = false
})
</script>

<template>
  <div v-if="currentWorkspace" class="matching-products-page">
    <!-- Purple Navigation Bar - Exactly like the image -->
    <div class="purple-nav-bar">
      <div class="nav-content">
        <div class="nav-left">
          <div class="nav-menu">
            <span class="nav-item">Catalogue</span>
            <span class="nav-item">Analytics</span>
            <span class="nav-item">Products</span>
            <span class="nav-item active">Matching</span>
            <span class="nav-item">Content</span>
            <span class="nav-item">Configuration</span>
          </div>
        </div>
        
        <div class="nav-right">
          <div class="nav-actions">
            <button class="nav-action-btn">
              <GeneralIcon icon="bell" class="h-4 w-4" />
            </button>
            <button class="nav-action-btn">
              <GeneralIcon icon="messageCircle" class="h-4 w-4" />
            </button>
            <button class="nav-action-btn">
              <GeneralIcon icon="settings" class="h-4 w-4" />
            </button>
            <div class="user-info">
              <div class="user-avatar">
                <GeneralIcon icon="user" class="h-4 w-4" />
              </div>
              <span class="user-name">Mitchell Admin</span>
              <span class="company-name">My Company (San Francisco)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - Matching Products -->
      <div class="left-panel">
        <div class="panel-header">
          <h2 class="panel-title">Matching Products (437)</h2>
        </div>
        
        <div class="filters-section">
          <div class="filter-row">
            <a-select placeholder="Brand" class="filter-select">
              <a-select-option value="all">All Brands</a-select-option>
              <a-select-option value="uppababy">UPPAbaby</a-select-option>
              <a-select-option value="bugaboo">Bugaboo</a-select-option>
            </a-select>
            
            <a-select placeholder="Category" class="filter-select">
              <a-select-option value="all">All Categories</a-select-option>
              <a-select-option value="strollers">Strollers</a-select-option>
              <a-select-option value="car-seats">Car Seats</a-select-option>
            </a-select>
            
            <a-select placeholder="Source" class="filter-select">
              <a-select-option value="all">All Sources</a-select-option>
              <a-select-option value="amazon">Amazon</a-select-option>
              <a-select-option value="target">Target</a-select-option>
            </a-select>
            
            <a-select placeholder="Status" class="filter-select">
              <a-select-option value="all">All Status</a-select-option>
              <a-select-option value="active">Active</a-select-option>
              <a-select-option value="pending">Pending</a-select-option>
            </a-select>
            
            <a-select placeholder="Order by" class="filter-select">
              <a-select-option value="recent">Most Recent</a-select-option>
              <a-select-option value="price">Price</a-select-option>
              <a-select-option value="name">Name</a-select-option>
            </a-select>
          </div>
          
          <div class="search-container">
            <a-input-search
              placeholder="Search products..."
              class="search-input"
            >
              <template #prefix>
                <GeneralIcon icon="search" class="h-4 w-4" />
              </template>
            </a-input-search>
          </div>
        </div>
        
        <div class="products-list">
          <div
            v-for="product in products"
            :key="product.id"
            :class="[
              'product-item',
              product.selected ? 'product-item-selected' : ''
            ]"
          >
            <div class="product-image">
              <img :src="product.image" :alt="product.name" />
            </div>
            <div class="product-details">
              <h4 class="product-name">{{ product.name }}</h4>
              <div class="product-meta">
                <span class="product-percentage">{{ product.percentage }}</span>
                <span class="product-price">{{ product.price }}</span>
              </div>
            </div>
            <div class="product-status">
              <div :class="['status-indicator', product.status]"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Panel - Select Options -->
      <div class="right-panel">
        <div class="panel-header">
          <h2 class="panel-title">Select one option (5)</h2>
          <button class="no-option-btn">No Option</button>
        </div>
        
        <div class="product-pairs">
          <div
            v-for="pair in productPairs"
            :key="pair.id"
            :class="[
              'product-pair',
              pair.selected ? 'product-pair-selected' : ''
            ]"
          >
            <div class="pair-row">
              <div class="product-card">
                <div class="product-image-large">
                  <img :src="pair.left.image" :alt="pair.left.name" />
                </div>
                <div class="product-info">
                  <h4 class="product-name">{{ pair.left.name }}</h4>
                  <p class="product-color">{{ pair.left.color }}</p>
                  <p class="product-sku">{{ pair.left.sku }}</p>
                  <p class="product-price">{{ pair.left.price }}</p>
                </div>
              </div>
              
              <div class="product-card">
                <div class="product-image-large">
                  <img :src="pair.right.image" :alt="pair.right.name" />
                </div>
                <div class="product-info">
                  <h4 class="product-name">{{ pair.right.name }}</h4>
                  <p class="product-color">{{ pair.right.color }}</p>
                  <p class="product-sku">{{ pair.right.sku }}</p>
                  <p class="product-price">{{ pair.right.price }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.matching-products-page {
  @apply flex flex-col h-screen bg-white;
}

/* Purple Navigation Bar - Exactly like the image */
.purple-nav-bar {
  @apply bg-gradient-to-r from-purple-600 to-purple-700 text-white;
  height: 60px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-content {
  @apply flex justify-between items-center px-6 h-full;
}

.nav-left {
  @apply flex items-center;
}

.nav-menu {
  @apply flex items-center gap-6;
}

.nav-item {
  @apply text-sm font-medium cursor-pointer hover:text-purple-200 transition-colors;
  
  &.active {
    @apply text-white font-semibold;
  }
}

.nav-right {
  @apply flex items-center;
}

.nav-actions {
  @apply flex items-center gap-3;
}

.nav-action-btn {
  @apply p-2 rounded-lg hover:bg-white/10 transition-colors;
}

.user-info {
  @apply flex items-center gap-3 ml-4;
}

.user-avatar {
  @apply w-8 h-8 bg-white/20 rounded-full flex items-center justify-center;
}

.user-name {
  @apply text-sm font-medium;
}

.company-name {
  @apply text-xs opacity-80;
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

.product-percentage {
  @apply text-xs font-medium text-green-600;
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
  @apply mb-6;
  
  &.product-pair-selected {
    .product-info {
      @apply bg-green-50 border border-green-200;
    }
  }
}

.pair-row {
  @apply flex gap-4;
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

.product-color {
  @apply text-xs text-gray-600 mb-1;
}

.product-sku {
  @apply text-xs text-gray-500 mb-1;
}

.product-info .product-price {
  @apply text-sm font-semibold text-gray-900;
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
  
  .nav-content {
    @apply px-4;
  }
  
  .nav-menu {
    @apply gap-3;
  }
  
  .user-name,
  .company-name {
    @apply hidden;
  }
}
</style>
