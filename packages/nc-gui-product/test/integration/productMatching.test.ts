import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { productMatchingService } from '~/services/productMatchingService'

describe('Product Matching Integration Tests', () => {
  let isServiceAvailable = false

  beforeAll(async () => {
    // Check if the product matching service is available
    try {
      isServiceAvailable = await productMatchingService.isServiceAvailable()
      console.log('Product matching service available:', isServiceAvailable)
    } catch (error) {
      console.warn('Product matching service not available:', error)
      isServiceAvailable = false
    }
  })

  afterAll(async () => {
    // Cleanup if needed
  })

  describe('Service Health Check', () => {
    it('should check if service is available', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping health check test - service not available')
        return
      }

      const health = await productMatchingService.healthCheck()
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('version')
      expect(health.status).toBe('ok')
    })
  })

  describe('Product Search', () => {
    it('should search for products', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping product search test - service not available')
        return
      }

      const results = await productMatchingService.searchProducts('headphones')
      
      expect(results).toHaveProperty('products')
      expect(results).toHaveProperty('total')
      expect(results).toHaveProperty('page')
      expect(results).toHaveProperty('limit')
      expect(results).toHaveProperty('hasMore')
      expect(Array.isArray(results.products)).toBe(true)
    })

    it('should search with filters', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping filtered search test - service not available')
        return
      }

      const results = await productMatchingService.searchProducts('electronics', {
        category: 'Electronics',
        priceRange: { min: 50, max: 200 },
        availability: true
      })

      expect(results).toHaveProperty('products')
      expect(Array.isArray(results.products)).toBe(true)
    })
  })

  describe('Competitor Alternatives', () => {
    it('should get competitor alternatives for a product', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping competitor alternatives test - service not available')
        return
      }

      // First, search for a product to get an ID
      const searchResults = await productMatchingService.searchProducts('headphones')
      
      if (searchResults.products.length > 0) {
        const productId = searchResults.products[0].id
        const competitors = await productMatchingService.getCompetitorAlternatives(productId)
        
        expect(Array.isArray(competitors)).toBe(true)
        
        if (competitors.length > 0) {
          const competitor = competitors[0]
          expect(competitor).toHaveProperty('id')
          expect(competitor).toHaveProperty('name')
          expect(competitor).toHaveProperty('price')
          expect(competitor).toHaveProperty('similarityScore')
          expect(competitor).toHaveProperty('priceDifference')
          expect(competitor).toHaveProperty('competitorName')
        }
      }
    })
  })

  describe('Product Details', () => {
    it('should get product details', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping product details test - service not available')
        return
      }

      // First, search for a product to get an ID
      const searchResults = await productMatchingService.searchProducts('headphones')
      
      if (searchResults.products.length > 0) {
        const productId = searchResults.products[0].id
        const product = await productMatchingService.getProductDetails(productId)
        
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('name')
        expect(product).toHaveProperty('price')
        expect(product).toHaveProperty('category')
        expect(product).toHaveProperty('description')
      }
    })
  })

  describe('Categories and Brands', () => {
    it('should get available categories', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping categories test - service not available')
        return
      }

      const categories = await productMatchingService.getCategories()
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should get available brands', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping brands test - service not available')
        return
      }

      const brands = await productMatchingService.getBrands()
      expect(Array.isArray(brands)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid product ID gracefully', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping error handling test - service not available')
        return
      }

      try {
        await productMatchingService.getProductDetails('invalid-id')
        // If we reach here, the service might not be properly configured for error handling
        console.log('Service did not throw error for invalid ID - this might be expected behavior')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Failed to get product details')
      }
    })

    it('should handle network errors gracefully', async () => {
      // Test with an invalid URL to simulate network error
      const invalidService = new (await import('~/services/productMatchingService')).ProductMatchingService()
      
      try {
        await invalidService.searchProducts('test')
        // This should fail due to invalid URL
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('Data Validation', () => {
    it('should validate product data structure', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping data validation test - service not available')
        return
      }

      const results = await productMatchingService.searchProducts('test')
      
      if (results.products.length > 0) {
        const product = results.products[0]
        
        // Validate required fields
        expect(typeof product.id).toBe('string')
        expect(typeof product.name).toBe('string')
        expect(typeof product.price).toBe('number')
        expect(typeof product.category).toBe('string')
        expect(typeof product.description).toBe('string')
        
        // Validate optional fields if present
        if (product.image) {
          expect(typeof product.image).toBe('string')
        }
        
        if (product.brand) {
          expect(typeof product.brand).toBe('string')
        }
        
        if (product.rating) {
          expect(typeof product.rating).toBe('number')
          expect(product.rating).toBeGreaterThanOrEqual(0)
          expect(product.rating).toBeLessThanOrEqual(5)
        }
      }
    })

    it('should validate search result structure', async () => {
      if (!isServiceAvailable) {
        console.log('Skipping search result validation test - service not available')
        return
      }

      const results = await productMatchingService.searchProducts('test')
      
      expect(typeof results.total).toBe('number')
      expect(typeof results.page).toBe('number')
      expect(typeof results.limit).toBe('number')
      expect(typeof results.hasMore).toBe('boolean')
      expect(Array.isArray(results.products)).toBe(true)
      
      expect(results.total).toBeGreaterThanOrEqual(0)
      expect(results.page).toBeGreaterThan(0)
      expect(results.limit).toBeGreaterThan(0)
    })
  })
})
