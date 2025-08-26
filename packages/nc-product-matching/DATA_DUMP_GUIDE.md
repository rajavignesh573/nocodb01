# Data Dump Guide for nc-product-matching

This guide explains how to use the data dump script to populate your database with realistic product matching data.

## Overview

The `dump-data.js` script generates comprehensive test data for the product matching system, including:

- **Internal Products**: Your catalog products (baby gear, toys, clothing)
- **External Products**: Products from various retail sources (Amazon, Target, Walmart, etc.)
- **Product Matches**: Sample matches between internal and external products
- **Brand Synonyms**: Common brand name variations for better matching

## Quick Start

### 1. Setup Database (if not already done)
```bash
npm run setup-db
```

### 2. Run Data Dump
```bash
npm run dump-data
```

## What Data is Generated

### Product Categories
The script generates products across multiple categories:

#### Baby Gear
- **Strollers**: UPPAbaby, Bugaboo, Nuna, Cybex, Thule, Graco, Chicco, Evenflo, Babyzen, Britax
- **Car Seats**: Graco, Chicco, Evenflo, Britax, Maxi-Cosi, Clek, Diono, Safety 1st, Cosco, UPPAbaby
- **High Chairs**: Graco, Chicco, Evenflo, Fisher-Price, Summer Infant, Inglesina, Stokke, Peg Perego

#### Toys
- **Educational**: Fisher-Price, VTech, LeapFrog, Melissa & Doug, Learning Resources, Educational Insights
- **Outdoor**: Little Tikes, Step2, Radio Flyer, Playskool, Fisher-Price, KidKraft

#### Clothing
- **Boys**: Carter's, OshKosh B'gosh, The Children's Place, Gap Kids, Old Navy, H&M Kids
- **Girls**: Carter's, OshKosh B'gosh, The Children's Place, Gap Kids, Old Navy, H&M Kids

### Retail Sources
- **Amazon (AMZ)**: -15% to +5% price variation
- **Target (TGT)**: -10% to +10% price variation
- **Walmart (WMT)**: -20% to 0% price variation
- **BuyBuy Baby (BBB)**: -5% to +15% price variation
- **Babies R Us (BRU)**: -8% to +12% price variation
- **Toys R Us (TRU)**: -12% to +8% price variation
- **Kohl's (KOH)**: -25% to +5% price variation
- **Macy's (MAC)**: -15% to +20% price variation

## Data Characteristics

### Internal Products
- **Quantity**: 3-10 products per subcategory (varies randomly)
- **Pricing**: Realistic price ranges for each category
- **GTINs**: Unique 13-digit product identifiers
- **SKUs**: Brand-category-number format (e.g., UPP-STR-0001)

### External Products
- **Quantity**: 2-4 external products per internal product
- **Price Variations**: Based on source characteristics
- **Title Variations**: Slight modifications to simulate real-world differences
- **GTIN Matching**: 30% chance of exact GTIN match for better matching

### Product Matches
- **Quantity**: 30% of external products have matches
- **Match Status**: 70% matched, 30% not matched
- **Scores**: 0.7 to 1.0 (realistic matching scores)
- **Price Deltas**: Calculated percentage differences

## Customization

### Modifying Product Categories
Edit the `PRODUCT_CATEGORIES` object in `dump-data.js`:

```javascript
const PRODUCT_CATEGORIES = {
  'your-category': {
    'your-subcategory': {
      brands: ['Brand1', 'Brand2', 'Brand3'],
      priceRange: { min: 10, max: 100 },
      features: ['Feature1', 'Feature2', 'Feature3']
    }
  }
};
```

### Adding New Retail Sources
Add to the `RETAIL_SOURCES` array:

```javascript
{
  id: 'src-yourstore-001',
  name: 'Your Store',
  code: 'YST',
  priceAdjustment: { min: -10, max: 10 }
}
```

### Adjusting Data Volume
Modify these variables in the script:
- `numProducts`: Change the range for products per subcategory
- `numExternal`: Change the range for external products per internal
- `matchCount`: Change the percentage of products with matches

## Database Schema

The script populates these tables:

### nc_internal_products
- Your catalog products
- Contains: title, brand, category, price, GTIN, SKU, description

### nc_external_products
- Products from external sources
- Contains: title, brand, category, price, GTIN, source information

### nc_product_matches
- Matches between internal and external products
- Contains: match scores, price deltas, status (matched/not_matched)

### nc_product_match_brand_synonyms
- Brand name variations for better matching
- Contains: canonical brand names and their variations

## Expected Output

After running the script, you should see output like:

```
🔗 Connected to database
🧹 Clearing existing data...
✅ Cleared existing data
📝 Inserting brand synonyms...
✅ Inserted brand synonyms
📝 Generating internal products...
✅ Generated 45 internal products
📝 Generating external products...
✅ Generated 180 external products
📝 Generating sample matches...
✅ Generated 54 sample matches

🎉 Data dump completed successfully!

📊 Database Summary:
   • Internal Products: 45
   • External Products: 180
   • Product Matches: 54
   • Data Sources: 8
   • Brand Synonyms: 120

📋 Product Categories:
   • baby-gear:
     - strollers: 8 products
     - car-seats: 7 products
     - high-chairs: 6 products
   • toys:
     - educational: 5 products
     - outdoor: 4 products
   • clothing:
     - boys: 8 products
     - girls: 7 products

🏪 Retail Sources:
   • Amazon (AMZ): 45 products
   • Target (TGT): 45 products
   • Walmart (WMT): 45 products
   • BuyBuy Baby (BBB): 45 products
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `config.js` file
   - Ensure PostgreSQL is running
   - Verify database credentials

2. **Permission Errors**
   - Ensure your database user has INSERT permissions
   - Check if tables exist (run `setup-db` first)

3. **Duplicate Key Errors**
   - The script uses `ON CONFLICT DO NOTHING` to handle duplicates
   - If you want fresh data, the script clears existing data first

### Resetting Data
To completely reset and regenerate data:
```bash
npm run setup-db  # Recreates tables
npm run dump-data # Populates with new data
```

## Next Steps

After running the data dump:

1. **Start the API Server**:
   ```bash
   npm start
   ```

2. **Test the Product Matching**:
   - Use the frontend to browse products
   - Test the matching algorithm
   - Verify that matches are working correctly

3. **Customize for Your Needs**:
   - Modify product categories
   - Add your own brands
   - Adjust price ranges
   - Add more retail sources

## Data Quality Features

The generated data includes realistic characteristics:

- **Price Variations**: Different sources have different pricing strategies
- **Title Variations**: External products have slightly different titles
- **GTIN Matching**: Some products share GTINs for exact matching
- **Brand Synonyms**: Common brand name variations
- **Realistic Scores**: Matching scores that reflect real-world scenarios
- **Price Deltas**: Calculated percentage differences between products

This provides a comprehensive test environment for your product matching system.
