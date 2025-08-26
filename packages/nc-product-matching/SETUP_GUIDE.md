# nc-product-matching Setup Guide

This guide will help you set up and test the `nc-product-matching` package with PostgreSQL and Postman.

## Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** (v16 or higher)
3. **Postman** for API testing

## Step 1: Configure Database Connection

1. **Update the database password** in `config.js`:
   ```javascript
   password: process.env.DB_PASSWORD || 'your_postgres_password_here',
   ```

2. **Or set environment variables**:
   ```bash
   # Windows PowerShell
   $env:DB_PASSWORD="your_postgres_password_here"
   
   # Windows Command Prompt
   set DB_PASSWORD=your_postgres_password_here
   
   # Linux/Mac
   export DB_PASSWORD="your_postgres_password_here"
   ```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Build TypeScript Code

```bash
npm run build
```

## Step 4: Set Up Database

```bash
npm run setup-db
```

This will:
- Create the `nc_product_matching` database
- Create all required tables
- Insert sample data (sources, rules, brand synonyms)

## Step 5: Start the API Server

```bash
npm start
```

The server will start on `http://localhost:3001`

## Step 6: Test with Postman

### Import Postman Collection

1. Open Postman
2. Click "Import" 
3. Select the `Postman_Collection.json` file from this directory
4. The collection will be imported with all endpoints pre-configured

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/info` | Get API info |
| GET | `/products` | Search local products |
| GET | `/products/:productId/candidates` | Get external candidates |
| POST | `/matches` | Confirm a match |
| GET | `/matches` | Get confirmed matches |
| DELETE | `/matches/:matchId` | Delete a match |

### Required Headers

- `x-tenant-id`: Your tenant ID (e.g., "test-tenant")
- `x-base-id`: Your base ID (e.g., "test-base") 
- `x-user-id`: User ID for match operations (e.g., "test-user")

### Sample Test Flow

1. **Health Check**: `GET /health`
2. **Get Info**: `GET /info`
3. **Get Products**: `GET /products?q=test&limit=10`
4. **Get Candidates**: `GET /products/PRODUCT-001/candidates?sources=AMZ,TGT&limit=5`
5. **Confirm Match**: `POST /matches` with body:
   ```json
   {
     "local_product_id": "PRODUCT-001",
     "external_product_key": "AMZ:B08N5WRWNW",
     "source_code": "AMZ",
     "score": 0.95,
     "price_delta_pct": -5.2,
     "rule_id": "rule-default-001",
     "status": "confirmed",
     "notes": "Exact match with GTIN"
   }
   ```
6. **Get Matches**: `GET /matches?status=confirmed&limit=10`

## Database Schema

The setup creates the following tables:

- `nc_product_match_sources` - External data sources (Amazon, Target, Walmart)
- `nc_product_match_rules` - Matching rules and algorithms
- `nc_product_match_sessions` - Review sessions
- `nc_product_matches` - Confirmed product matches
- `nc_product_match_brand_synonyms` - Brand normalization

## Sample Data

The setup includes:

- **3 Sources**: Amazon (AMZ), Target (TGT), Walmart (WMT)
- **2 Rules**: Default Rule, Strict Rule
- **4 Brand Synonyms**: Nike, Adidas variants

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running**:
   ```bash
   # Windows
   net start postgresql
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. **Verify credentials** in `config.js`

3. **Test connection manually**:
   ```bash
   psql -h localhost -U postgres -d postgres
   ```

### Server Issues

1. **Check port availability**: Make sure port 3001 is free
2. **Check logs**: Look for error messages in the console
3. **Verify build**: Run `npm run build` again

### API Issues

1. **Check headers**: Ensure all required headers are set
2. **Check JSON format**: Verify request body is valid JSON
3. **Check server logs**: Look for error messages

## Development

### Running in Development Mode

```bash
npm run dev-server
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Next Steps

1. **Integrate with NocoDB**: Import the module into your NocoDB application
2. **Add Real Data Sources**: Configure actual external product catalogs
3. **Implement Matching Algorithm**: Replace mock logic with real fuzzy matching
4. **Add Authentication**: Implement proper user authentication
5. **Add Rate Limiting**: Protect against abuse
6. **Add Monitoring**: Add logging and metrics

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify database connectivity
3. Test individual endpoints
4. Check the NocoDB documentation for integration patterns
