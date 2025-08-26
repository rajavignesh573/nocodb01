# Product Matcher Extension

A powerful product matching and comparison extension for NocoDB that helps you find and compare products with competitor alternatives.

## Features

- **Advanced Product Search**: Search through your product catalog with intelligent filtering
- **Competitor Analysis**: Automatically find and compare competitor alternatives
- **Price Comparison**: Visual price difference indicators and similarity scoring
- **Match Management**: Confirm or reject product matches with audit trail
- **Multi-source Support**: Support for multiple external data sources
- **Side-by-Side Comparison**: Compare original products with competitor alternatives
- **Export Functionality**: Export comparison data in various formats

## Installation

### Prerequisites

- NocoDB installed and running
- Node.js 18+ and pnpm
- nc-product-matching backend service running

### Steps

1. **Copy the extension files** to your NocoDB extensions directory:
   ```bash
   # Navigate to your NocoDB extensions directory
   cd packages/nc-gui/extensions/
   
   # Copy the product-matcher extension
   cp -r product-matcher /path/to/your/nocodb/packages/nc-gui/extensions/
   ```

2. **Configure environment variables**:
   ```bash
   # Add to your .env file
   NUXT_PUBLIC_PRODUCT_MATCHING_API_URL=http://localhost:3001
   ```

3. **Restart NocoDB** to load the new extension:
   ```bash
   # From your NocoDB root directory
   pnpm run start:frontend
   ```

## Usage

1. **Access the Product Matcher**:
   - Open your NocoDB dashboard
   - Click the "Extensions" button in the top toolbar
   - Find the Product Matcher extension in the panel
   - Click on it to open the product matcher

2. **Search and Filter Products**:
   - Use the search bar to find specific products
   - Filter by brand, category, source, or status
   - Sort by price, name, or match score

3. **Compare Products**:
   - Select a product from the left panel
   - View matching alternatives in the right panel
   - Compare products side-by-side
   - Confirm or reject matches

## Technical Details

### Architecture

- **Frontend**: Vue.js component with Ant Design Vue UI components
- **Backend Integration**: Connects to nc-product-matching service
- **State Management**: Reactive state management with Vue composables
- **API Integration**: RESTful API communication with external services
- **Real-time Updates**: Live data synchronization and updates

### File Structure

```
packages/nc-gui/extensions/product-matcher/
├── manifest.json              # Extension metadata
├── description.md             # Extension description
├── package.json               # Package configuration
├── index.vue                  # Main Vue.js component
├── composables/               # Vue composables
│   ├── useProductMatching.ts  # Main composable
│   └── useProductMatchingApi.ts # API composable
├── services/                  # Service layer
│   └── productMatchingService.ts # API service
└── assets/                    # Static assets
    ├── icon.svg               # Extension icon
    └── publisher-icon.svg     # Publisher icon
```

### API Integration

The extension integrates with the `nc-product-matching` service through:

- **RESTful API**: HTTP endpoints for product search and matching
- **Real-time Updates**: Live data synchronization
- **Error Handling**: Comprehensive error handling and retry logic
- **Caching**: Intelligent caching for performance optimization

## Configuration

### Environment Variables

```env
# Product Matching API URL
NUXT_PUBLIC_PRODUCT_MATCHING_API_URL=http://localhost:3001
```

### Backend Service

The extension requires the `nc-product-matching` backend service to be running. This service provides:

- Product search and filtering
- Competitor product matching
- Match confirmation and rejection
- Analytics and reporting
- Export functionality

## Development

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nocodb/nocodb.git
   cd nocodb
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   pnpm run start:frontend
   ```

### Building

The extension is built as part of the main NocoDB build process:

```bash
pnpm run build
```

## Troubleshooting

### Common Issues

1. **Extension not appearing**: Ensure the extension is properly copied to the extensions directory
2. **API connection errors**: Check that the nc-product-matching service is running
3. **Environment variables**: Verify that `NUXT_PUBLIC_PRODUCT_MATCHING_API_URL` is set correctly

### Debug Mode

Enable debug mode by setting the environment variable:

```env
DEBUG=product-matcher:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This extension is licensed under the MIT License.
