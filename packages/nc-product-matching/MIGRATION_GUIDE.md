# Product Matching Data Migration Guide

This guide explains how to migrate your CSV data into the NocoDB Product Matching database.

## 📋 Prerequisites

1. **PostgreSQL Database**: Make sure PostgreSQL is running and accessible
2. **Node.js**: Version 14 or higher
3. **CSV Data Files**: Your data files should be in the `dumb data` directory
4. **Dependencies**: Install required packages

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd packages/nc-product-matching
npm install csv-parser pg
```

### 2. Configure Database Connection

Edit `config.js` to match your PostgreSQL settings:

```javascript
module.exports = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'testdb01',  // Your database name
    user: 'postgres',      // Your database user
    password: 'postgres',  // Your database password
  },
  server: {
    port: process.env.PORT || 3001,
  }
};
```

### 3. Setup Database Schema

Run the database setup script to create all necessary tables:

```bash
node setup-database.js
```

## 📁 Data Structure

The migration expects the following CSV files in the `dumb data` directory:

- `categories_202508231359.csv` - Product categories
- `products_202508231359.csv` - Product information
- `skus_202508231359.csv` - SKU details
- `source_catalog_202508231359.csv` - Data sources
- `media_assets_202508231359.csv` - Media files
- `media_links_202508231359.csv` - Media associations

### Expected CSV Structure

#### Categories
```csv
category_id,tenant_id,code,name,parent_id,level,path,meta,created_at,created_by,updated_at,updated_by
```

#### Products
```csv
product_id,tenant_id,organization_id,brand,title,slug,default_locale,category_id,source_id,description,status,is_deleted,meta,created_at,created_by,updated_at,updated_by
```

#### SKUs
```csv
sku_id,tenant_id,product_id,internal_sku,manufacturer_sku,gtin,sku_title,status,is_deleted,box_weight_kg,box_length_cm,box_width_cm,box_height_cm,meta,created_at,created_by,updated_at,updated_by
```

## 🚀 Running the Migration

### Option 1: Enhanced Migration (Recommended)

Use the enhanced migration script with better error handling and validation:

```bash
node run-migration.js
```

### Option 2: Original Migration

Use the original migration script:

```bash
node migrate-real-data.js
```

### Option 3: Direct Enhanced Migration

```bash
node migrate-real-data-enhanced.js
```

## 🔍 Migration Process

The migration process includes:

1. **Data Validation**: Checks for required files and data integrity
2. **Database Cleanup**: Removes existing data to prevent conflicts
3. **Source Creation**: Creates data sources (or uses defaults)
4. **Media Assets**: Imports media files and metadata
5. **Category Mapping**: Converts Spanish categories to English
6. **Product Import**: Creates internal products from your CSV data
7. **Media Links**: Associates media with products
8. **External Products**: Generates sample external products for matching
9. **Brand Synonyms**: Creates brand variations for better matching
10. **Sample Matches**: Generates initial product matches

## 📊 Expected Output

After successful migration, you should see:

```
🎉 Enhanced real data migration completed successfully!

📊 Database Summary:
   • Internal Products: [number]
   • External Products: [number]
   • Product Matches: [number]
   • Data Sources: [number]
   • Brand Synonyms: [number]
   • Media Assets: [number]
   • Media Links: [number]

🏪 Sources:
   • [Source Name]: [count] products

🏷️ Top Brands:
   • [Brand Name]: [count] products

📁 Categories:
   • [Category]: [count] products
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify connection settings in `config.js`
   - Ensure database exists

2. **CSV File Not Found**
   - Verify files are in the `dumb data` directory
   - Check file names match expected format
   - Ensure files are readable

3. **Permission Errors**
   - Check database user permissions
   - Ensure write access to database

4. **Memory Issues**
   - For large datasets, consider processing in batches
   - Increase Node.js memory limit: `node --max-old-space-size=4096 run-migration.js`

### Data Validation Warnings

The migration may show warnings for:
- Products without SKUs (skipped)
- SKUs without products (skipped)
- Missing media assets (uses placeholder images)
- Invalid GTIN values (skipped)

These warnings are normal and don't affect the migration.

## 🎯 Post-Migration

After successful migration:

1. **Start the Server**:
   ```bash
   node server.js
   ```

2. **Test the API**:
   - Access: http://localhost:3001
   - Use the provided Postman collection for testing

3. **Verify Data**:
   ```bash
   node check-db.js
   ```

## 📈 Data Quality Improvements

The enhanced migration includes:

- **Category Normalization**: Spanish categories mapped to English
- **Brand Standardization**: Consistent brand naming
- **Price Generation**: Realistic pricing for products
- **Media Handling**: Fallback images for missing media
- **Data Validation**: Checks for data integrity
- **Error Recovery**: Graceful handling of missing data

## 🔄 Re-running Migration

To re-run the migration:

1. The script automatically clears existing data
2. No manual cleanup required
3. Safe to run multiple times

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console output for specific error messages
3. Verify your data format matches the expected structure
4. Ensure all prerequisites are met

## 🎉 Success Indicators

Migration is successful when you see:
- ✅ All validation checks pass
- ✅ No critical errors in console
- ✅ Database summary shows expected counts
- ✅ Server starts without errors
- ✅ API endpoints respond correctly
