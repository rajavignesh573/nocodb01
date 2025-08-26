import { ref, computed } from 'vue'

// Types based on the backend schema
export interface Product {
  id: string
  title: string
  brand?: string
  category_id?: string
  price?: number
  gtin?: string
  media?: Array<{ url: string }>
}

export interface ExternalProduct {
  external_product_key: string
  source: {
    id: string
    code: string
    name: string
  }
  title: string
  brand?: string
  price?: number
  image?: string
  gtin?: string
  score: number
  explanations: {
    name: number
    brand: number
    category: number
    price: number
    gtin?: number
  }
}

export interface ProductMatch {
  id: string
  local_product_id: string
  external_product_key: string
  source_id: string
  score: number
  price_delta_pct: number
  rule_id: string
  session_id?: string
  status: 'matched' | 'not_matched' | 'superseded'
  reviewed_by?: string
  reviewed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProductFilter {
  q?: string
  categoryId?: string
  brand?: string
  status?: string
  limit?: number
  offset?: number
  sortBy?: 'title' | 'brand' | 'updated_at'
  sortDir?: 'asc' | 'desc'
}

export interface CandidateFilter {
  sources?: string[]
  brand?: string
  categoryId?: string
  priceBandPct?: number
  ruleId?: string
  limit?: number
}

export interface MatchData {
  local_product_id: string
  external_product_key: string
  source_code: string
  score: number
  price_delta_pct: number
  rule_id: string
  status: 'matched' | 'not_matched'
  session_id?: string
  notes?: string
}

// API Base URL - use environment variable or fallback to default
const API_BASE_URL = process.env.NUXT_PUBLIC_PRODUCT_MATCHING_API_URL || 'http://localhost:3001'

export function useProductMatchingApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Helper function to make API calls
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get products from the backend
  const getProducts = async (filter: ProductFilter = {}) => {
    const params = new URLSearchParams()
    
    if (filter.q) params.append('q', filter.q)
    if (filter.categoryId) params.append('categoryId', filter.categoryId)
    if (filter.brand) params.append('brand', filter.brand)
    if (filter.status) params.append('status', filter.status)
    if (filter.limit) params.append('limit', filter.limit.toString())
    if (filter.offset) params.append('offset', filter.offset.toString())
    if (filter.sortBy) params.append('sortBy', filter.sortBy)
    if (filter.sortDir) params.append('sortDir', filter.sortDir)

    return apiCall<{ items: Product[]; page: number; total: number }>(
      `/products?${params.toString()}`
    )
  }

  // Get candidates for a specific product
  const getCandidates = async (productId: string, filter: CandidateFilter = {}) => {
    const params = new URLSearchParams()
    
    if (filter.sources) params.append('sources', filter.sources.join(','))
    if (filter.brand) params.append('brand', filter.brand)
    if (filter.categoryId) params.append('categoryId', filter.categoryId)
    if (filter.priceBandPct) params.append('priceBandPct', filter.priceBandPct.toString())
    if (filter.ruleId) params.append('ruleId', filter.ruleId)
    if (filter.limit) params.append('limit', filter.limit.toString())

    return apiCall<{ items: ExternalProduct[]; generated_at: string }>(
      `/products/${productId}/candidates?${params.toString()}`
    )
  }

  // Confirm a match
  const confirmMatch = async (matchData: MatchData) => {
    return apiCall<ProductMatch>('/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    })
  }

  // Get matches
  const getMatches = async (filters: {
    localProductId?: string
    externalProductKey?: string
    source?: string
    reviewedBy?: string
    status?: string
    limit?: number
    offset?: number
  } = {}) => {
    const params = new URLSearchParams()
    
    if (filters.localProductId) params.append('localProductId', filters.localProductId)
    if (filters.externalProductKey) params.append('externalProductKey', filters.externalProductKey)
    if (filters.source) params.append('source', filters.source)
    if (filters.reviewedBy) params.append('reviewedBy', filters.reviewedBy)
    if (filters.status) params.append('status', filters.status)
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())

    return apiCall<{ items: ProductMatch[]; page: number; total: number }>(
      `/matches?${params.toString()}`
    )
  }

  // Delete a match
  const deleteMatch = async (matchId: string) => {
    return apiCall(`/matches/${matchId}`, {
      method: 'DELETE',
    })
  }

  // Health check
  const healthCheck = async () => {
    return apiCall<{ status: string; version: string; time: string }>('/health')
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    getProducts,
    getCandidates,
    confirmMatch,
    getMatches,
    deleteMatch,
    healthCheck,
  }
}
