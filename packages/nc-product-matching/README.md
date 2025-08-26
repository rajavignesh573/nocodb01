# nc-product-matching

A NocoDB package that provides product matching functionality, allowing users to search internal products and find equivalent competitor products from external sources.

## Features

- **Product Search**: Search local NocoDB database for products with flexible filtering
- **External Matching**: Find similar products from external sources using fuzzy matching
- **Match Management**: Confirm or reject product matches with audit trail
- **Multi-source Support**: Support for multiple external data sources
- **Configurable Rules**: Customizable matching algorithms and scoring rules
- **Session Management**: Optional review sessions for batch processing

## Installation

This package is designed to be used within the NocoDB monorepo structure.

```bash
# From the root of the NocoDB monorepo
cd packages/nc-product-matching
npm install
npm run build
```

## Usage

### Integration with NocoDB

To integrate this package with NocoDB, you need to:

1. **Import the module** in your NocoDB app module:

```typescript
import { ProductMatchingModule } from 'nc-product-matching';

@Module({
  imports: [
    // ... other modules
    ProductMatchingModule,
  ],
})
export class AppModule {}
```

2. **Run the migration** to create the required database tables:

```typescript
import { up } from 'nc-product-matching';

// In your migration runner
await up(knex);
```

### API Endpoints

The package provides the following REST API endpoints:

#### Health Check
```
GET /api/v1/db/data/v1/:projectId/:tableName/product-matching/health
```

#### Get Product Information
```
GET /api/v1/db/data/v1/:projectId/:tableName/product-matching/info
```

#### Search Local Products
```
GET /api/v1/db/data/v1/:projectId/:tableName/product-matching/products
```

Query Parameters:
- `q` - Search query
- `categoryId` - Filter by category
- `brand` - Filter by brand
- `status` - Filter by status
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)
- `sortBy` - Sort field (title|brand|updated_at)
- `sortDir` - Sort direction (asc|desc)

#### Get External Candidates
```
GET /api/v1/db/data/v1/:projectId/:tableName/product-matching/products/:productId/candidates
```

Query Parameters:
- `sources` - Comma-separated list of source codes
- `brand` - Filter by brand
- `categoryId` - Filter by category
- `priceBandPct` - Price band percentage (default: 15)
- `ruleId` - Matching rule ID
- `limit` - Number of candidates (default: 25)

#### Confirm Match
```
POST /api/v1/db/data/v1/:projectId/:tableName/product-matching/matches
```

Request Body:
```json
{
  "local_product_id": "string",
  "external_product_key": "string",
  "source_code": "string",
  "score": 0.95,
  "price_delta_pct": -5.2,
  "rule_id": "string",
  "status": "confirmed",
  "session_id": "string",
  "notes": "string"
}
```

#### Get Matches
```
GET /api/v1/db/data/v1/:projectId/:tableName/product-matching/matches
```

Query Parameters:
- `localProductId` - Filter by local product ID
- `externalProductKey` - Filter by external product key
- `source` - Filter by source
- `reviewedBy` - Filter by reviewer
- `status` - Filter by status
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

#### Delete Match
```
DELETE /api/v1/db/data/v1/:projectId/:tableName/product-matching/matches/:matchId
```

## Database Schema

The package creates the following tables:

- `nc_product_match_sources` - External data sources
- `nc_product_match_brand_synonyms` - Brand normalization
- `nc_product_match_category_map` - Category mappings
- `nc_product_match_rules` - Matching rules and algorithms
- `nc_product_match_sessions` - Review sessions
- `nc_product_matches` - Confirmed product matches
- `nc_product_match_candidates` - Cached suggestions
- `nc_product_search_log` - Search audit log

## Configuration

### Setting up External Sources

```typescript
import { ProductMatchSource } from 'nc-product-matching';

// Create a new source
await ProductMatchSource.insert(context, {
  name: 'Amazon',
  code: 'AMZ',
  base_config: JSON.stringify({
    baseId: 'b_amz',
    productsTable: 'products',
    attrTable: 'attribute_value_normalized'
  }),
  is_active: true,
  created_by: userId,
}, ncMeta);
```

### Creating Matching Rules

```typescript
import { ProductMatchRule } from 'nc-product-matching';

// Create a default rule
await ProductMatchRule.insert(context, {
  name: 'Default Rule',
  weights: JSON.stringify({
    name: 0.4,
    brand: 0.3,
    category: 0.2,
    price: 0.1
  }),
  price_band_pct: 15,
  algorithm: 'jarowinkler',
  min_score: 0.65,
  is_default: true,
  created_by: userId,
}, ncMeta);
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:watch
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Architecture

The package follows the NocoDB architecture patterns:

- **Models**: Database entities with CRUD operations
- **Services**: Business logic and data processing
- **Controllers**: HTTP request handling and validation
- **Migrations**: Database schema management

### Key Components

1. **ProductMatchingService**: Core business logic for product matching
2. **ProductMatch**: Model for managing confirmed matches
3. **ProductMatchSource**: Model for external data sources
4. **ProductMatchingController**: HTTP API endpoints

## Contributing

1. Follow the existing NocoDB code patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure all linting rules pass

## License

MIT License - see LICENSE file for details
