# Product Matching Integration

This document describes the integration between the `nc-gui-product` frontend and the `nc-product-matching` backend.

## Overview

The product matching feature allows users to:
- View local products from their NocoDB database
- Find matching external products from various sources (Amazon, Walmart, etc.)
- Compare products side-by-side
- Confirm or reject product matches
- Track match history and status

## Architecture

### Frontend (`nc-gui-product`)
- **Location**: `packages/nc-gui-product/`
- **Main Component**: `components/workspace/product/view.vue`
- **API Service**: `composables/useProductMatchingApi.ts`
- **State Management**: `composables/useProductMatching.ts`

### Backend (`nc-product-matching`)
- **Location**: `packages/nc-product-matching/`
- **API Server**: Express.js server with NestJS-style controllers
- **Database**: PostgreSQL with product matching tables
- **Port**: 3001 (configurable)

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd packages/nc-product-matching

# Install dependencies
npm install

# Build the project
npm run build

# Setup database (requires PostgreSQL)
npm run setup-db

# Start the server
npm start
```

### 2. Frontend Setup

The frontend is already configured to connect to the backend. The API base URL is set to `http://localhost:3001` in `useProductMatchingApi.ts`.

### 3. Database Configuration

The backend uses PostgreSQL. Update the database configuration in `packages/nc-product-matching/config.js`:

```javascript
database: {
  host: 'localhost',
  port: 5432,
  database: 'your_database_name',
  user: 'your_username',
  password: 'your_password',
}
```

## API Endpoints

### Health Check
- `GET /health` - Check if the backend is running

### Products
- `GET /products` - Get local products with filtering
- `GET /products/:id/candidates` - Get external candidates for a product

### Matches
- `GET /matches` - Get confirmed/rejected matches
- `POST /matches` - Confirm or reject a match
- `DELETE /matches/:id` - Delete a match

## Data Flow

1. **Product Loading**: Frontend loads local products from the backend
2. **Product Selection**: User selects a product to find matches for
3. **Candidate Loading**: Backend finds external candidates for the selected product
4. **Match Confirmation**: User can confirm or reject matches
5. **State Updates**: Frontend updates the UI based on match status

## Schema Integration

### Frontend Data Types

```typescript
interface Product {
  id: string
  title: string
  brand?: string
  category_id?: string
  price?: number
  gtin?: string
  media?: Array<{ url: string }>
}

interface ExternalProduct {
  external_product_key: string
  source: { id: string; code: string; name: string }
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
```

### Backend Database Tables

- `nc_product_matches` - Stores confirmed/rejected matches
- `nc_product_match_sources` - Stores external data sources

## Features

### Filtering
- Search by product name/brand
- Filter by brand, category, source, status
- Sort by match score, price, or name

### Match Management
- View match candidates with similarity scores
- Confirm or reject matches
- Track match history
- View match explanations (name, brand, category, price similarity)

### UI Features
- Two-panel layout (products list + match options)
- Real-time filtering and sorting
- Loading states and error handling
- Responsive design

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `ProductMatchingController.ts`
2. **Frontend**: Update API service in `useProductMatchingApi.ts`
3. **State**: Update composable in `useProductMatching.ts`
4. **UI**: Update component in `view.vue`

### Testing

```bash
# Backend tests
cd packages/nc-product-matching
npm test

# Frontend tests
cd packages/nc-gui-product
npm test
```

## Troubleshooting

### Common Issues

1. **Backend not starting**: Check PostgreSQL connection and database setup
2. **CORS errors**: Ensure backend CORS is configured for frontend origin
3. **API errors**: Check backend logs and API endpoint URLs
4. **No data**: Verify database has products and matches

### Debug Mode

Enable debug logging in the backend by setting `DEBUG=true` environment variable.

## Future Enhancements

- Real-time match updates
- Batch match operations
- Advanced filtering and analytics
- Export functionality
- Integration with more external sources
