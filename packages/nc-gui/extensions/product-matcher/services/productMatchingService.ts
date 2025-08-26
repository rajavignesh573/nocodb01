import type { 
  Product, 
  SearchResult, 
  CompetitorProduct, 
  SearchFilters,
  ProductComparison 
} from '../composables/useProductMatching'

// Configuration
const API_BASE_URL = process.env.NUXT_PUBLIC_PRODUCT_MATCHING_API_URL || 'http://localhost:3001'
const API_TIMEOUT = 30000 // 30 seconds

// API client
class ProductMatchingAPI {
  private baseURL: string
  private timeout: number

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL
    this.timeout = timeout
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  // Product search
  async searchProducts(
    query: string, 
    filters: SearchFilters = {}, 
    page = 1, 
    limit = 20
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
      ...this.buildFilterParams(filters)
    })

    return this.request<SearchResult>(`/api/products/search?${params}`)
  }

  // Get competitor alternatives
  async getCompetitorAlternatives(productId: string): Promise<CompetitorProduct[]> {
    return this.request<CompetitorProduct[]>(`/api/products/${productId}/competitors`)
  }

  // Get product details
  async getProductDetails(productId: string): Promise<Product> {
    return this.request<Product>(`/api/products/${productId}`)
  }

  // Save product match
  async saveProductMatch(
    originalProductId: string, 
    competitorProductId: string, 
    notes?: string
  ): Promise<void> {
    await this.request('/api/matches', {
      method: 'POST',
      body: JSON.stringify({
        originalProductId,
        competitorProductId,
        notes
      })
    })
  }

  // Get match history
  async getProductMatchHistory(productId: string): Promise<Product[]> {
    return this.request<Product[]>(`/api/products/${productId}/matches`)
  }

  // Get comparison analytics
  async getComparisonAnalytics(productId: string): Promise<ProductComparison> {
    return this.request<ProductComparison>(`/api/products/${productId}/comparison`)
  }

  // Export comparison data
  async exportComparison(
    productId: string, 
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/products/${productId}/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`)
    }

    return response.blob()
  }

  // Get product categories
  async getCategories(): Promise<string[]> {
    return this.request<string[]>('/api/categories')
  }

  // Get brands
  async getBrands(): Promise<string[]> {
    return this.request<string[]>('/api/brands')
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/api/health')
  }

  // Helper method to build filter parameters
  private buildFilterParams(filters: SearchFilters): Record<string, string> {
    const params: Record<string, string> = {}

    if (filters.category) {
      params.category = filters.category
    }

    if (filters.brand) {
      params.brand = filters.brand
    }

    if (filters.availability !== undefined) {
      params.availability = filters.availability.toString()
    }

    if (filters.rating) {
      params.rating = filters.rating.toString()
    }

    if (filters.priceRange) {
      params.minPrice = filters.priceRange.min.toString()
      params.maxPrice = filters.priceRange.max.toString()
    }

    return params
  }
}

// Create API instance
const api = new ProductMatchingAPI(API_BASE_URL, API_TIMEOUT)

// Service class
export class ProductMatchingService {
  private api: ProductMatchingAPI

  constructor() {
    this.api = api
  }

  // Search products with error handling and retry logic
  async searchProducts(
    query: string, 
    filters: SearchFilters = {}, 
    page = 1, 
    limit = 20
  ): Promise<SearchResult> {
    try {
      return await this.api.searchProducts(query, filters, page, limit)
    } catch (error) {
      console.error('Search products error:', error)
      throw new Error(`Failed to search products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get competitor alternatives with caching
  async getCompetitorAlternatives(productId: string): Promise<CompetitorProduct[]> {
    try {
      return await this.api.getCompetitorAlternatives(productId)
    } catch (error) {
      console.error('Get competitor alternatives error:', error)
      throw new Error(`Failed to get competitor alternatives: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get product details
  async getProductDetails(productId: string): Promise<Product> {
    try {
      return await this.api.getProductDetails(productId)
    } catch (error) {
      console.error('Get product details error:', error)
      throw new Error(`Failed to get product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Save product match
  async saveProductMatch(
    originalProductId: string, 
    competitorProductId: string, 
    notes?: string
  ): Promise<void> {
    try {
      await this.api.saveProductMatch(originalProductId, competitorProductId, notes)
    } catch (error) {
      console.error('Save product match error:', error)
      throw new Error(`Failed to save product match: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get match history
  async getProductMatchHistory(productId: string): Promise<Product[]> {
    try {
      return await this.api.getProductMatchHistory(productId)
    } catch (error) {
      console.error('Get match history error:', error)
      throw new Error(`Failed to get match history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get comparison analytics
  async getComparisonAnalytics(productId: string): Promise<ProductComparison> {
    try {
      return await this.api.getComparisonAnalytics(productId)
    } catch (error) {
      console.error('Get comparison analytics error:', error)
      throw new Error(`Failed to get comparison analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Export comparison data
  async exportComparison(
    productId: string, 
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      return await this.api.exportComparison(productId, format)
    } catch (error) {
      console.error('Export comparison error:', error)
      throw new Error(`Failed to export comparison: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get categories
  async getCategories(): Promise<string[]> {
    try {
      return await this.api.getCategories()
    } catch (error) {
      console.error('Get categories error:', error)
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get brands
  async getBrands(): Promise<string[]> {
    try {
      return await this.api.getBrands()
    } catch (error) {
      console.error('Get brands error:', error)
      throw new Error(`Failed to get brands: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      return await this.api.healthCheck()
    } catch (error) {
      console.error('Health check error:', error)
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Utility method to check if service is available
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.healthCheck()
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const productMatchingService = new ProductMatchingService()

// Export types for convenience
export type { Product, SearchResult, CompetitorProduct, SearchFilters, ProductComparison }
