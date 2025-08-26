import { ref, computed, watch } from 'vue'
import { useProductMatchingApi, type Product, type ExternalProduct, type ProductMatch } from './useProductMatchingApi'

// Utility function to safely format price
const formatPrice = (price: unknown): string => {
  if (price === null || price === undefined) return '0.00'
  const numPrice = typeof price === 'string' ? Number.parseFloat(price) : Number(price)
  return Number.isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
}

export { formatPrice }

export function useProductMatching() {
  const api = useProductMatchingApi()
  
  // State - ensure these are always arrays
  const products = ref<Product[]>([])
  const selectedProduct = ref<Product | null>(null)
  const candidates = ref<ExternalProduct[]>([])
  const matches = ref<ProductMatch[]>([])
  const filters = ref({
    search: '',
    brand: '',
    category: '',
    source: '',
    status: '',
    orderBy: 'score' as 'score' | 'price' | 'name'
  })

  // Computed
  const filteredProducts = computed(() => {
    // Ensure products.value is always an array
    const productsArray = Array.isArray(products.value) ? products.value : []
    let filtered = [...productsArray] // Create a copy to avoid mutations

    if (filters.value.search) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(filters.value.search.toLowerCase()) ||
        product.brand?.toLowerCase().includes(filters.value.search.toLowerCase())
      )
    }

    if (filters.value.brand) {
      filtered = filtered.filter(product => product.brand === filters.value.brand)
    }

    if (filters.value.category) {
      filtered = filtered.filter(product => product.category_id === filters.value.category)
    }

    if (filters.value.status) {
      filtered = filtered.filter(product => {
        const productMatches = matches.value.filter(match => match.local_product_id === product.id)
        return productMatches.some(match => match.status === filters.value.status)
      })
    }

    // Sort
    if (filters.value.orderBy === 'price') {
      filtered = filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (filters.value.orderBy === 'name') {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      // Sort by highest match score
      filtered = filtered.sort((a, b) => {
        const aMatches = matches.value.filter(match => match.local_product_id === a.id)
        const bMatches = matches.value.filter(match => match.local_product_id === b.id)
        const aMaxScore = Math.max(...aMatches.map(m => m.score), 0)
        const bMaxScore = Math.max(...bMatches.map(m => m.score), 0)
        return bMaxScore - aMaxScore
      })
    }

    return filtered
  })

  const productSelectionOptions = computed(() => {
    if (!selectedProduct.value) return []

    // Ensure candidates.value is always an array
    const candidatesArray = Array.isArray(candidates.value) ? candidates.value : []

    // Group candidates by source and create selection options
    const sourceGroups = new Map<string, ExternalProduct[]>()
    
    for (const candidate of candidatesArray) {
      const sourceCode = candidate.source.code
      if (!sourceGroups.has(sourceCode)) {
        sourceGroups.set(sourceCode, [])
      }
      const group = sourceGroups.get(sourceCode)
      if (group) {
        group.push(candidate)
      }
    }

    const options: Array<{
      id: string
      source: string
      leftProduct: Product
      rightProduct: ExternalProduct
      score: number
      priceDelta: number
      selected: boolean
    }> = []

    for (const [sourceCode, sourceCandidates] of sourceGroups) {
      for (const candidate of sourceCandidates) {
        const existingMatch = matches.value.find(match => 
          match.local_product_id === selectedProduct.value?.id &&
          match.external_product_key === candidate.external_product_key &&
          match.status === 'matched'
        )

        if (selectedProduct.value) {
          options.push({
            id: `${selectedProduct.value.id}-${candidate.external_product_key}`,
            source: sourceCode,
            leftProduct: selectedProduct.value,
            rightProduct: candidate,
            score: candidate.score,
            priceDelta: candidate.score, // This should be calculated based on price difference
            selected: !!existingMatch
          })
        }
      }
    }

    return options
  })

  // Methods
  const loadProducts = async () => {
    try {
      const result = await api.getProducts({
        q: filters.value.search || undefined,
        brand: filters.value.brand || undefined,
        categoryId: filters.value.category || undefined,
        status: filters.value.status || undefined,
        sortBy: filters.value.orderBy === 'name' ? 'title' : 'updated_at',
        sortDir: 'desc',
        limit: 50
      })
      // Ensure we always set an array
      products.value = Array.isArray(result?.items) ? result.items : []
    } catch (error) {
      console.error('Failed to load products:', error)
      // Ensure we always set an array
      products.value = []
    }
  }

  const loadCandidates = async (productId: string) => {
    try {
      const result = await api.getCandidates(productId, {
        sources: filters.value.source ? [filters.value.source] : undefined,
        brand: filters.value.brand || undefined,
        limit: 25
      })
      // Ensure we always set an array
      candidates.value = Array.isArray(result?.items) ? result.items : []
    } catch (error) {
      console.error('Failed to load candidates:', error)
      // Ensure we always set an array
      candidates.value = []
    }
  }

  const loadMatches = async () => {
    try {
      const result = await api.getMatches({
        status: 'matched',
        limit: 100
      })
      // Ensure we always set an array
      matches.value = Array.isArray(result?.items) ? result.items : []
    } catch (error) {
      console.error('Failed to load matches:', error)
      // Ensure we always set an array
      matches.value = []
    }
  }

  const selectProduct = async (product: Product) => {
    selectedProduct.value = product
    await loadCandidates(product.id)
  }

  const confirmMatch = async (optionId: string) => {
    const option = productSelectionOptions.value.find(opt => opt.id === optionId)
    if (!option) return

    try {
      const matchData = {
        local_product_id: option.leftProduct.id,
        external_product_key: option.rightProduct.external_product_key,
        source_code: option.rightProduct.source.code,
        score: option.score,
        price_delta_pct: option.priceDelta,
        rule_id: 'default-rule', // This should come from the backend
        status: 'matched' as const,
        session_id: `session-${Date.now()}`,
        notes: 'Confirmed via UI'
      }

      await api.confirmMatch(matchData)
      
      // Refresh matches
      await loadMatches()
      
      // Update the option selection
      const optionIndex = productSelectionOptions.value.findIndex(opt => opt.id === optionId)
      if (optionIndex !== -1) {
        // This would update the local state to reflect the confirmed match
      }
    } catch (error) {
      console.error('Failed to confirm match:', error)
    }
  }

  const rejectMatch = async (optionId: string) => {
    const option = productSelectionOptions.value.find(opt => opt.id === optionId)
    if (!option) return

    try {
      const matchData = {
        local_product_id: option.leftProduct.id,
        external_product_key: option.rightProduct.external_product_key,
        source_code: option.rightProduct.source.code,
        score: option.score,
        price_delta_pct: option.priceDelta,
        rule_id: 'default-rule',
        status: 'not_matched' as const,
        session_id: `session-${Date.now()}`,
        notes: 'Rejected via UI'
      }

      await api.confirmMatch(matchData)
      await loadMatches()
    } catch (error) {
      console.error('Failed to reject match:', error)
    }
  }

  // Watch for filter changes
  watch(filters, () => {
    loadProducts()
  }, { deep: true })

  // Initialize
  const initialize = async () => {
    await Promise.all([
      loadProducts(),
      loadMatches()
    ])
  }

  return {
    // State
    products: computed(() => products.value),
    selectedProduct: computed(() => selectedProduct.value),
    candidates: computed(() => candidates.value),
    matches: computed(() => matches.value),
    filters,
    
    // Computed
    filteredProducts,
    productSelectionOptions,
    
    // Methods
    loadProducts,
    loadCandidates,
    loadMatches,
    selectProduct,
    confirmMatch,
    rejectMatch,
    initialize,
    
    // API state
    loading: api.loading,
    error: api.error
  }
}
