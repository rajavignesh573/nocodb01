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

## Usage

1. Click on the Product Matcher icon in the extensions panel
2. Search and filter your products using the left panel
3. Select a product to view matching alternatives
4. Compare products side-by-side in the right panel
5. Confirm or reject matches based on your analysis

## Technical Details

- **Frontend**: Vue.js component with Ant Design Vue UI components
- **Backend Integration**: Connects to nc-product-matching service
- **State Management**: Reactive state management with Vue composables
- **API Integration**: RESTful API communication with external services
- **Real-time Updates**: Live data synchronization and updates

## Configuration

The extension requires the `nc-product-matching` backend service to be running. Set the following environment variable:

```env
NUXT_PUBLIC_PRODUCT_MATCHING_API_URL=http://localhost:3001
```
