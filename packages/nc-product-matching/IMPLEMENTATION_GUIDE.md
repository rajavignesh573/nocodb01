# Product Matching Implementation Guide

## Overview

This implementation provides a complete product matching system for NocoDB that allows users to:
- Search through internal product catalog (left panel)
- Find similar products from external sources (right panel)
- Compare prices and features
- Confirm or reject matches

## Database Schema

### Tables Created

1. **nc_product_match_sources** - External data sources (Amazon, Target, Walmart, etc.)
2. **nc_internal_products** - Internal product catalog
3. **nc_external_products** - Scraped external product data
4. **nc_product_match_brand_synonyms** - Brand name variations
5. **nc_product_match_rules** - Matching rules and algorithms
6. **nc_product_match_sessions** - Matching sessions
7. **nc_product_matches** - Confirmed/rejected matches

### Sample Data

The system comes with comprehensive dummy data for baby strollers:

#### Internal Products (10 items)
- UPPAbaby VISTA V2 Stroller ($969.99)
- Bugaboo Fox 3 Stroller ($1,299.00)
- Nuna MIXX Next Stroller ($649.95)
- Cybex Gazelle S Stroller ($849.95)
- Thule Spring Stroller ($399.95)
- Graco Modes Pramette Stroller ($299.99)
- Chicco Bravo Trio Travel System ($399.99)
- Evenflo Pivot Xpand Modular Travel System ($369.99)
- Babyzen YOYO2 Stroller ($499.99)
- Britax B-Free Stroller ($379.99)

#### External Products (15 items across 5 sources)
- **Amazon**: 3 products with slight price variations
- **Target**: 3 products with competitive pricing
- **Walmart**: 3 products with budget-friendly options
- **BuyBuy Baby**: 3 premium products
- **Babies R Us**: 3 products with exclusive deals

#### Sources
- Amazon (AMZ)
- Target (TGT)
- Walmart (WMT)
- BuyBuy Baby (BBB)
- Babies R Us (BRU)

## API Endpoints

### 1. Get Products (Internal Catalog)
```
GET /products
```
Returns internal products with filtering and pagination.

**Query Parameters:**
- `q` - Search term
- `brand` - Filter by brand
- `categoryId` - Filter by category
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset
- `sortBy` - Sort field (title, brand, updated_at)
- `sortDir` - Sort direction (asc, desc)

### 2. Get Candidates (External Matches)
```
GET /products/{productId}/candidates
```
Returns similar products from external sources for a given internal product.

**Query Parameters:**
- `sources` - Comma-separated source codes
- `brand` - Filter by brand
- `categoryId` - Filter by category
- `priceBandPct` - Price difference tolerance (default: 15%)
- `ruleId` - Matching rule to use
- `limit` - Number of results (default: 25)

### 3. Confirm/Reject Match
```
POST /matches
```
Confirms or rejects a product match.

**Request Body:**
```json
{
  "local_product_id": "int-001",
  "external_product_key": "AMZ-UPPAbaby-VISTA-V2",
  "source_code": "AMZ",
  "score": 0.95,
  "price_delta_pct": -2.06,
  "rule_id": "rule-default-001",
  "status": "confirmed",
  "session_id": "session-123",
  "notes": "High confidence match"
}
```

### 4. Get Matches
```
GET /matches
```
Returns confirmed/rejected matches.

**Query Parameters:**
- `localProductId` - Filter by internal product
- `externalProductKey` - Filter by external product
- `source` - Filter by source
- `status` - Filter by status (confirmed, rejected, superseded)
- `limit` - Number of results
- `offset` - Pagination offset

## Matching Algorithm

The system uses a weighted similarity scoring algorithm:

### Score Components
1. **Name Similarity (40%)** - Word overlap between product titles
2. **Brand Similarity (30%)** - Exact brand match with synonyms support
3. **GTIN Match (20%)** - Global Trade Item Number comparison
4. **Price Similarity (10%)** - Price difference percentage

### Scoring Logic
- **Name**: Common words / total words
- **Brand**: Exact match = 1.0, no match = 0.0
- **GTIN**: Exact match = 1.0, no match = 0.0
- **Price**: Based on percentage difference (5% = 1.0, 25% = 0.5)

### Filters Applied
- **Minimum Score**: 0.65 (default rule) or 0.8 (strict rule)
- **Price Band**: ±15% (default) or ±10% (strict)
- **Availability**: Only available products
- **Source Filtering**: By specific sources if requested

## Frontend Integration

### Composable: useProductMatching
```typescript
const {
  products,           // Internal products
  selectedProduct,    // Currently selected product
  candidates,         // External candidates
  matches,           // Confirmed matches
  filters,           // Search/filter state
  filteredProducts,  // Filtered internal products
  productSelectionOptions, // Formatted options for UI
  loadProducts,      // Load internal products
  loadCandidates,    // Load external candidates
  selectProduct,     // Select a product
  confirmMatch,      // Confirm a match
  rejectMatch,       // Reject a match
  loading,          // Loading state
  error             // Error state
} = useProductMatching()
```

### API Composable: useProductMatchingApi
```typescript
const {
  getProducts,       // GET /products
  getCandidates,     // GET /products/{id}/candidates
  confirmMatch,      // POST /matches
  getMatches,        // GET /matches
  deleteMatch,       // DELETE /matches/{id}
  healthCheck        // GET /health
} = useProductMatchingApi()
```

## Setup Instructions

### 1. Database Setup
```bash
cd packages/nc-product-matching
npm run setup-db
```

### 2. Build Backend
```bash
npm run build
```

### 3. Start Backend Server
```bash
npm start
```

### 4. Frontend Configuration
Set environment variable:
```env
NUXT_PUBLIC_PRODUCT_MATCHING_API_URL=http://localhost:3001
```

## Usage Example

### 1. Load Products
The left panel will automatically load internal products from the database.

### 2. Search and Filter
- Use the search bar to find specific products
- Filter by brand, category, source, or status
- Sort by match score, price, or name

### 3. Select Product
Click on any internal product to see matching candidates from external sources.

### 4. Review Candidates
The right panel shows:
- Product images side by side
- Price comparison
- Match score
- Source information

### 5. Confirm/Reject
Click on candidates to confirm or reject matches.

## Data Flow

1. **Frontend** loads internal products from `/products`
2. **User** selects a product from the left panel
3. **Frontend** calls `/products/{id}/candidates`
4. **Backend** queries external products and calculates similarity scores
5. **Frontend** displays candidates in the right panel
6. **User** confirms/rejects matches
7. **Frontend** calls `POST /matches` to save decisions
8. **Backend** stores match data in database

## Customization

### Adding New Sources
1. Insert into `nc_product_match_sources`
2. Add external products to `nc_external_products`
3. Update brand synonyms if needed

### Adding New Products
1. Insert into `nc_internal_products` for internal catalog
2. Insert into `nc_external_products` for external data

### Modifying Matching Rules
1. Update weights in `nc_product_match_rules`
2. Adjust minimum scores and price bands
3. Create custom algorithms if needed

## Performance Considerations

- Database indexes on frequently queried fields
- Pagination for large result sets
- Caching for frequently accessed data
- Background processing for similarity calculations

## Error Handling

- Graceful fallbacks when API calls fail
- User-friendly error messages
- Retry mechanisms for transient failures
- Logging for debugging

## Security

- Input validation on all endpoints
- SQL injection prevention
- Rate limiting for API calls
- Authentication and authorization (to be implemented)

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Matching**: Machine learning algorithms
3. **Bulk Operations**: Batch confirm/reject functionality
4. **Analytics Dashboard**: Match statistics and insights
5. **Integration APIs**: Connect to real e-commerce platforms
6. **Image Recognition**: Visual similarity matching
7. **Price Tracking**: Historical price analysis
8. **Competitive Intelligence**: Market analysis features
