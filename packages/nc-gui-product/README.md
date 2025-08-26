# NocoDB Product GUI

A specialized frontend package for NocoDB that provides product matching and comparison functionality. This package extends the standard NocoDB GUI with product-specific features and integrates with the `nc-product-matching` backend service.

## Features

### 🎯 Product Matching
- **Advanced Search**: Search through your product catalog with intelligent filtering
- **Competitor Analysis**: Automatically find and compare competitor alternatives
- **Price Comparison**: Visual price difference indicators and similarity scoring
- **Match History**: Track previous product matches and decisions

### 📊 Comparison Tools
- **Side-by-Side Comparison**: Compare original products with competitor alternatives
- **Analytics Dashboard**: View comparison metrics and insights
- **Export Functionality**: Export comparison data in CSV, JSON, or PDF formats
- **Filtering Options**: Filter by category, brand, price range, and availability

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface built with Ant Design Vue
- **Product Cards**: Visual product representation with images and details
- **Interactive Elements**: Hover effects, loading states, and smooth transitions
- **Mobile Responsive**: Optimized for all device sizes

## Installation

This package is part of the NocoDB monorepo and should be installed alongside the main NocoDB installation.

### Prerequisites
- Node.js >= 18
- pnpm >= 9.6.0
- NocoDB backend running
- nc-product-matching service running

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nocodb/nocodb.git
   cd nocodb
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `packages/nc-gui-product` directory:
   ```env
   NUXT_PUBLIC_PRODUCT_MATCHING_API_URL=http://localhost:3001
   NUXT_PUBLIC_NC_BACKEND_URL=http://localhost:8080
   ```

4. **Start the development server**:
   ```bash
   # Start only the product GUI (runs on port 4000)
   pnpm start:frontend:product
   
   # Or start from the package directory
   cd packages/nc-gui-product
   pnpm dev
   ```

## Development Scripts

### Available Scripts

From the root directory, you can use these scripts:

- `pnpm start:frontend` - Start the main NocoDB GUI (port 3000)
- `pnpm start:frontend:product` - Start the Product GUI (port 4000)
- `pnpm start:frontend:both` - Start both GUIs simultaneously
- `pnpm start:backend` - Start the NocoDB backend

### Port Configuration

- **Main NocoDB GUI**: Runs on port 3000 (http://localhost:3000)
- **Product GUI**: Runs on port 4000 (http://localhost:4000)

### Running Both Frontends

To run both the main NocoDB GUI and the Product GUI simultaneously:

```bash
pnpm start:frontend:both
```

This will start:
- Main NocoDB GUI on http://localhost:3000
- Product GUI on http://localhost:4000

## Usage

### Basic Product Search

1. Navigate to the Product Matching page
2. Use the search bar to find products in your catalog
3. Click on a product card to view details and competitor alternatives
4. Compare prices and features to make informed decisions

### Advanced Features

#### Filtering Products
```typescript
import { useProductMatching } from '~/composables/useProductMatching'

const { searchProducts } = useProductMatching()

// Search with filters
const results = await searchProducts('headphones', {
  category: 'Electronics',
  priceRange: { min: 50, max: 200 },
  brand: 'TechAudio',
  availability: true,
  rating: 4
})
```

#### Getting Competitor Alternatives
```typescript
const { getCompetitorAlternatives } = useProductMatching()

// Get competitors for a specific product
const competitors = await getCompetitorAlternatives('product-id-123')
```

#### Saving Product Matches
```typescript
const { saveProductMatch } = useProductMatching()

// Save a product match with notes
await saveProductMatch(
  'original-product-id',
  'competitor-product-id',
  'Better price, similar features'
)
```

### API Integration

The package integrates with the `nc-product-matching` service through a dedicated service layer:

```typescript
import { productMatchingService } from '~/services/productMatchingService'

// Direct service usage
const products = await productMatchingService.searchProducts('query')
const competitors = await productMatchingService.getCompetitorAlternatives('product-id')
```

## Architecture

### Directory Structure
```
packages/nc-gui-product/
├── components/
│   └── product/
│       └── ProductMatching.vue      # Main product matching component
├── composables/
│   └── useProductMatching.ts        # Vue composable for product matching
├── services/
│   └── productMatchingService.ts    # API service layer
├── pages/
│   └── product-matching.vue         # Product matching page
├── package.json                     # Package configuration
└── README.md                        # This file
```

### Key Components

#### ProductMatching.vue
The main component that provides the product matching interface. Features:
- Search functionality with filters
- Product card grid layout
- Side-by-side comparison view
- Loading states and error handling

#### useProductMatching.ts
A Vue composable that provides reactive state management and business logic for product matching. Features:
- Reactive state management
- API integration
- Error handling
- Caching and optimization

#### productMatchingService.ts
Service layer that handles communication with the `nc-product-matching` backend. Features:
- HTTP client with timeout handling
- Error handling and retry logic
- Type-safe API calls
- Health check functionality

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NUXT_PUBLIC_PRODUCT_MATCHING_API_URL` | URL of the product matching API | `http://localhost:3001` |
| `NUXT_PUBLIC_NC_BACKEND_URL` | URL of the NocoDB backend | `http://localhost:8080` |

### API Configuration

The service can be configured through the `ProductMatchingService` class:

```typescript
import { ProductMatchingService } from '~/services/productMatchingService'

const service = new ProductMatchingService()
// Configure timeout, base URL, etc.
```

## Development

### Building for Production

```bash
# Build the package
pnpm build

# Generate static files
pnpm generate

# Start production server
pnpm start
```

### Testing

```bash
# Run unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run coverage
pnpm coverage
```

### Linting

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Integration with nc-product-matching

This package is designed to work seamlessly with the `nc-product-matching` backend service. The integration includes:

### API Endpoints
- `GET /api/products/search` - Search products
- `GET /api/products/{id}/competitors` - Get competitor alternatives
- `POST /api/matches` - Save product matches
- `GET /api/products/{id}/comparison` - Get comparison analytics
- `GET /api/products/{id}/export` - Export comparison data

### Data Flow
1. User searches for products in the frontend
2. Frontend calls the product matching API
3. API processes the search and returns results
4. Frontend displays results and allows product selection
5. When a product is selected, frontend requests competitor alternatives
6. API finds and returns competitor products with similarity scores
7. Frontend displays comparison view
8. User can save matches and export data

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

### Development Guidelines

- Follow the existing code style and conventions
- Add TypeScript types for all new interfaces
- Include error handling for all API calls
- Write tests for new functionality
- Update documentation for new features

## License

This package is part of NocoDB and is licensed under the AGPL-3.0-or-later license.

## Support

For support and questions:
- GitHub Issues: [https://github.com/nocodb/nocodb/issues](https://github.com/nocodb/nocodb/issues)
- Documentation: [https://docs.nocodb.com](https://docs.nocodb.com)
- Community: [https://community.nocodb.com](https://community.nocodb.com)
