#!/usr/bin/env node

/**
 * Integration Test Script for nc-gui-product and nc-product-matching
 * 
 * This script tests the connection between the frontend and backend services
 * to ensure they can communicate properly.
 */

const fetch = require('node-fetch')

// Configuration
const PRODUCT_MATCHING_API_URL = process.env.NUXT_PUBLIC_PRODUCT_MATCHING_API_URL || 'http://localhost:3001'
const NC_BACKEND_URL = process.env.NUXT_PUBLIC_NC_BACKEND_URL || 'http://localhost:8080'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Test functions
async function testHealthCheck() {
  try {
    logInfo('Testing health check...')
    const response = await fetch(`${PRODUCT_MATCHING_API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    logSuccess(`Health check passed: ${data.status} (v${data.version})`)
    return true
  } catch (error) {
    logError(`Health check failed: ${error.message}`)
    return false
  }
}

async function testProductSearch() {
  try {
    logInfo('Testing product search...')
    const response = await fetch(`${PRODUCT_MATCHING_API_URL}/api/products/search?q=headphones&page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    logSuccess(`Product search successful: Found ${data.total} products`)
    
    if (data.products && data.products.length > 0) {
      logInfo(`Sample product: ${data.products[0].name} - $${data.products[0].price}`)
    }
    
    return data.products && data.products.length > 0
  } catch (error) {
    logError(`Product search failed: ${error.message}`)
    return false
  }
}

async function testCompetitorAlternatives() {
  try {
    logInfo('Testing competitor alternatives...')
    
    // First, search for a product to get an ID
    const searchResponse = await fetch(`${PRODUCT_MATCHING_API_URL}/api/products/search?q=headphones&page=1&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    if (!searchResponse.ok) {
      throw new Error(`Search failed: HTTP ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    if (!searchData.products || searchData.products.length === 0) {
      logWarning('No products found for competitor test')
      return false
    }

    const productId = searchData.products[0].id
    logInfo(`Testing competitors for product: ${productId}`)

    const response = await fetch(`${PRODUCT_MATCHING_API_URL}/api/products/${productId}/competitors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    logSuccess(`Competitor alternatives found: ${data.length} competitors`)
    
    if (data.length > 0) {
      const competitor = data[0]
      logInfo(`Sample competitor: ${competitor.name} - $${competitor.price} (${competitor.similarityScore} similarity)`)
    }
    
    return true
  } catch (error) {
    logError(`Competitor alternatives failed: ${error.message}`)
    return false
  }
}

async function testCategories() {
  try {
    logInfo('Testing categories endpoint...')
    const response = await fetch(`${PRODUCT_MATCHING_API_URL}/api/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    logSuccess(`Categories retrieved: ${data.length} categories`)
    
    if (data.length > 0) {
      logInfo(`Sample categories: ${data.slice(0, 3).join(', ')}`)
    }
    
    return true
  } catch (error) {
    logError(`Categories test failed: ${error.message}`)
    return false
  }
}

async function testNocoDBBackend() {
  try {
    logInfo('Testing NocoDB backend connection...')
    const response = await fetch(`${NC_BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 5000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    logSuccess('NocoDB backend is accessible')
    return true
  } catch (error) {
    logWarning(`NocoDB backend not accessible: ${error.message}`)
    return false
  }
}

// Main test runner
async function runIntegrationTests() {
  log('🚀 Starting Integration Tests', 'bright')
  log(`Product Matching API: ${PRODUCT_MATCHING_API_URL}`, 'cyan')
  log(`NocoDB Backend: ${NC_BACKEND_URL}`, 'cyan')
  log('')

  const results = {
    healthCheck: false,
    productSearch: false,
    competitorAlternatives: false,
    categories: false,
    nocodbBackend: false
  }

  // Run tests
  results.healthCheck = await testHealthCheck()
  log('')
  
  results.productSearch = await testProductSearch()
  log('')
  
  results.competitorAlternatives = await testCompetitorAlternatives()
  log('')
  
  results.categories = await testCategories()
  log('')
  
  results.nocodbBackend = await testNocoDBBackend()
  log('')

  // Summary
  log('📊 Test Results Summary:', 'bright')
  log('')
  
  const testNames = {
    healthCheck: 'Health Check',
    productSearch: 'Product Search',
    competitorAlternatives: 'Competitor Alternatives',
    categories: 'Categories',
    nocodbBackend: 'NocoDB Backend'
  }

  const totalTests = Object.keys(results).length
  let passedTests = 0

  for (const [test, result] of Object.entries(results)) {
    const status = result ? 'PASS' : 'FAIL'
    const color = result ? 'green' : 'red'
    log(`${status}: ${testNames[test]}`, color)
    if (result) passedTests++
  }

  log('')
  log(`Overall: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow')

  if (passedTests === totalTests) {
    log('🎉 All integration tests passed! The services are properly connected.', 'green')
    process.exit(0)
  } else {
    log('⚠️  Some tests failed. Please check the service configurations.', 'yellow')
    process.exit(1)
  }
}

// Handle command line arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  log('Integration Test Script for nc-gui-product and nc-product-matching', 'bright')
  log('')
  log('Usage: node test-integration.js [options]', 'cyan')
  log('')
  log('Options:', 'bright')
  log('  --help, -h     Show this help message')
  log('  --health       Only run health check')
  log('  --search       Only run product search test')
  log('  --competitors  Only run competitor alternatives test')
  log('')
  log('Environment Variables:', 'bright')
  log('  NUXT_PUBLIC_PRODUCT_MATCHING_API_URL  Product matching API URL (default: http://localhost:3001)')
  log('  NUXT_PUBLIC_NC_BACKEND_URL            NocoDB backend URL (default: http://localhost:8080)')
  log('')
  process.exit(0)
}

// Run specific tests if requested
if (args.includes('--health')) {
  testHealthCheck().then(result => {
    process.exit(result ? 0 : 1)
  })
} else if (args.includes('--search')) {
  testProductSearch().then(result => {
    process.exit(result ? 0 : 1)
  })
} else if (args.includes('--competitors')) {
  testCompetitorAlternatives().then(result => {
    process.exit(result ? 0 : 1)
  })
} else {
  // Run all tests
  runIntegrationTests().catch(error => {
    logError(`Test runner failed: ${error.message}`)
    process.exit(1)
  })
}
