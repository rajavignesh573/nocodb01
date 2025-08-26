# Natural Language → NocoDB API Orchestration System

## Overview

This system allows users to query NocoDB using natural language, converting user intent into structured NocoDB API requests with correct endpoints and request structures. It supports step decomposition, handles ambiguous names, supports filters, and provides flexible output formats.

## 🚀 Production Ready

This system is now **production-ready** with the following improvements:

### ✅ Production Features

1. **Real API Integration**: 
   - Replaced mock data with actual NocoDB API calls
   - Uses `BasesV3Service`, `TablesV3Service`, `ViewsV3Service`, and `DataV3Service`
   - Proper error handling and fallback mechanisms

2. **OpenAI Integration**:
   - Configured with real OpenAI API keys
   - Proper API key validation and error handling
   - Production-ready configuration management

3. **Enhanced Security**:
   - Environment variable-based configuration
   - API key validation and masking
   - Proper error handling without exposing sensitive data

4. **Performance Optimizations**:
   - Schema catalog caching with configurable TTL
   - Concurrent API call limits
   - Request timeout configurations

5. **Monitoring & Debugging**:
   - Comprehensive logging
   - Health check endpoints
   - Production test script

### 🔧 Production Setup

For production deployment, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for detailed instructions.

**Quick Start:**
```bash
# 1. Set environment variables
export OPENAI_API_KEY=sk-your-actual-api-key
export ENABLE_AI_ASSISTANT=true

# 2. Run production test
node test-production-setup.js

# 3. Start the server
pnpm run start
```

## Architecture

### Core Components

1. **LLM Planner Service** (`llm-planner.service.ts`)
   - Converts natural language queries into structured plans
   - Uses OpenAI to generate JSON plans with intent, entities, and steps
   - Validates plan structure and completeness

2. **Schema Catalog Service** (`schema-catalog.service.ts`)
   - Caches and manages NocoDB schema information
   - Stores bases, tables, views, and columns metadata
   - Provides fast lookup and resolution of entity names
   - Auto-refreshes on TTL expiration
   - **Production**: Uses actual NocoDB API calls with fallback

3. **Query Executor Service** (`query-executor.service.ts`)
   - Resolves placeholders in query plans using schema catalog
   - Executes actual NocoDB API calls
   - Handles step-by-step plan execution
   - Provides execution metadata and error handling
   - **Production**: Integrates with `DataV3Service` for real data operations

4. **Response Formatter Service** (`response-formatter.service.ts`)
   - Converts API responses into user-requested formats
   - Supports table (markdown), JSON, and chart formats
   - Provides metadata about results

5. **NL Orchestrator Service** (`nl-orchestrator.service.ts`)
   - Main coordination service
   - Orchestrates the entire query processing pipeline
   - Handles error cases and ambiguous entity resolution

6. **NL Query Controller** (`nl-query.controller.ts`)
   - REST API endpoints for natural language queries
   - Schema information and refresh endpoints
   - Entity resolution endpoints

7. **AI Service** (`ai.service.ts`)
   - **Production**: Enhanced with proper OpenAI configuration
   - API key validation and error handling
   - Integration with NL orchestration system

## API Endpoints

### Natural Language Query
```http
POST /api/v1/db/data/v1/noco/default/nl-query
Content-Type: application/json

{
  "query": "get all data from orders",
  "format": "table"
}
```

**Response:**
```json
{
  "success": true,
  "content": "| ID | Customer | City | Amount |\n|----|----------|------|--------|\n| 1  | John Doe | NY   | 100.50 |\n| 2  | Jane Smith | LA | 250.75 |",
  "metadata": {
    "baseId": "default",
    "tableId": "tbl_orders",
    "rowCount": 2,
    "executionTime": 1250
  }
}
```

### Schema Information
```http
GET /api/v1/db/data/v1/noco/default/nl-query/schema
```

### Refresh Schema
```http
POST /api/v1/db/data/v1/noco/default/nl-query/refresh-schema
```

### Resolve Ambiguous Entity
```http
POST /api/v1/db/data/v1/noco/default/nl-query/resolve
Content-Type: application/json

{
  "entityType": "table",
  "entityName": "customers"
}
```

## Usage Examples

### Basic Queries
```bash
# List all bases
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "list all bases", "format": "table"}'

# Get all data from a table
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "show all customers", "format": "table"}'

# Filtered queries
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "find customers in New York", "format": "json"}'
```

### Advanced Queries
```bash
# Complex filtering
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "show orders with amount greater than 100", "format": "table"}'

# Multiple conditions
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "find customers in New York with email containing gmail", "format": "json"}'
```

## Configuration

### Environment Variables

**Required:**
```env
OPENAI_API_KEY=sk-your-actual-api-key
ENABLE_AI_ASSISTANT=true
AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini
```

**Optional:**
```env
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.1
AI_TIMEOUT=60000
AI_RETRIES=3
NL_SCHEMA_CACHE_TTL=300000
NL_MAX_QUERY_STEPS=10
NL_DEFAULT_FORMAT=table
NL_DEBUG_LOGGING=false
```

### Performance Tuning

For high-traffic applications:
```env
AI_MAX_TOKENS=4000
AI_TIMEOUT=120000
NL_MAX_CONCURRENT_CALLS=10
NL_SCHEMA_CACHE_TTL=600000  # 10 minutes
```

For development/testing:
```env
AI_MAX_TOKENS=1000
AI_TIMEOUT=30000
NL_MAX_CONCURRENT_CALLS=3
NL_SCHEMA_CACHE_TTL=60000   # 1 minute
```

## Query Planning Details

### Supported Endpoints

The LLM planner generates plans using these NocoDB API endpoints:

- `GET /api/v2/meta/bases` - List all bases
- `GET /api/v2/meta/bases/{baseId}/tables` - List tables in a base
- `GET /api/v2/meta/bases/{baseId}/views` - List views in a base
- `GET /api/v2/meta/bases/{baseId}/tables/{tableId}/rows` - Get table rows
- `GET /api/v2/meta/bases/{baseId}/views/{viewId}/rows` - Get view rows

### Query Plan Structure

```json
{
  "intent": "fetch_filtered_data",
  "entities": {
    "table": "customers",
    "filters": {
      "city": "New York"
    },
    "format": "table"
  },
  "steps": [
    {
      "action": "list all bases",
      "endpoint": "/api/v2/meta/bases"
    },
    {
      "action": "find customers table",
      "endpoint": "/api/v2/meta/bases/{baseId}/tables"
    },
    {
      "action": "fetch filtered rows",
      "endpoint": "/api/v2/meta/bases/{baseId}/tables/{tableId}/rows",
      "params": {
        "where": "city,eq,New York"
      }
    }
  ]
}
```

## Schema Catalog Structure

The schema catalog maintains an in-memory cache of NocoDB metadata:

```typescript
interface SchemaCatalog {
  bases: SchemaBase[];
  lastUpdated: Date;
  version: string;
}

interface SchemaBase {
  id: string;
  title: string;
  description?: string;
  tables: SchemaTable[];
  views: SchemaView[];
}

interface SchemaTable {
  id: string;
  title: string;
  type: 'table';
  columns: SchemaColumn[];
  baseId: string;
}

interface SchemaView {
  id: string;
  title: string;
  type: 'view';
  tableId: string;
  baseId: string;
}
```

## Error Handling

### Common Error Scenarios

1. **API Key Issues**:
   - Invalid format (must start with `sk-`)
   - Missing or expired key
   - Insufficient credits

2. **Database Connection Issues**:
   - Invalid database URL
   - Connection timeouts
   - Permission errors

3. **Schema Catalog Issues**:
   - Failed to fetch bases/tables/views
   - Cache corruption
   - Permission issues

### Error Response Format

```json
{
  "success": false,
  "error": "Failed to fetch data: Table not found",
  "content": "I couldn't find the specified table. Please check the table name and try again.",
  "metadata": {
    "executionTime": 500,
    "attemptedSteps": 2
  }
}
```

## Performance Considerations

### Caching Strategy

- **Schema Catalog**: Cached for 5 minutes by default
- **Query Plans**: Not cached (regenerated for each query)
- **API Responses**: Not cached (fresh data each time)

### Optimization Tips

1. **Reduce API Calls**: Use specific table names instead of searching
2. **Limit Results**: Add natural language limits ("show first 10 customers")
3. **Use Views**: Create views for complex queries
4. **Monitor Usage**: Track OpenAI API usage and costs

### Monitoring

Enable debug logging for troubleshooting:
```env
NL_DEBUG_LOGGING=true
```

Monitor these metrics:
- Response times for NL queries
- Schema catalog refresh frequency
- API call success rates
- Memory usage

## Testing

### Production Test Script

Run the production test script to verify your setup:

```bash
node test-production-setup.js
```

This script checks:
- Environment variables
- OpenAI API connection
- File structure
- Package dependencies
- TypeScript compilation

### Manual Testing

Test the health endpoint:
```bash
curl -X GET "http://localhost:8080/api/v1/db/data/v1/default/default/ai/health"
```

Test a simple query:
```bash
curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "list all bases", "format": "table"}'
```

## Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**:
   - Check environment variables
   - Verify API key format
   - Restart the server

2. **"Table not found"**:
   - Check table name spelling
   - Verify user permissions
   - Refresh schema catalog

3. **"Schema catalog refresh failed"**:
   - Check database connection
   - Verify user permissions
   - Enable debug logging

4. **Slow response times**:
   - Increase timeouts
   - Reduce token limits
   - Optimize queries

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? 'API Key Set' : 'API Key Missing')"

# Test OpenAI connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Check NocoDB logs
tail -f logs/nocodb.log
```

## Future Enhancements

### Planned Features

1. **Advanced Filtering**:
   - Date range queries
   - Numeric comparisons
   - Text search with wildcards

2. **Query Optimization**:
   - Plan caching
   - Result caching
   - Query optimization hints

3. **Enhanced Output Formats**:
   - Charts and graphs
   - Export to CSV/Excel
   - Custom templates

4. **Multi-language Support**:
   - Non-English queries
   - Localized responses
   - Language detection

5. **Advanced Analytics**:
   - Query analytics
   - Usage statistics
   - Performance metrics

### Integration Opportunities

1. **Webhook Support**: Trigger actions based on query results
2. **Scheduled Queries**: Run queries on a schedule
3. **Query Templates**: Save and reuse common queries
4. **Collaboration**: Share query results with team members

## Security Considerations

### API Key Security

- Never commit API keys to version control
- Use environment variables or secret management
- Rotate keys regularly
- Monitor usage for anomalies

### Data Privacy

- Review what data is sent to OpenAI
- Implement data filtering if needed
- Comply with data protection regulations
- Audit query logs

### Access Control

- Use NocoDB's existing authentication
- Implement role-based access control
- Monitor API usage
- Set up alerts for suspicious activity

## Support

For issues and questions:

1. Check the [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) guide
2. Review the troubleshooting section above
3. Check NocoDB documentation
4. Monitor logs for error details
5. Contact the development team

## Contributing

To contribute to this system:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test in production-like environment
5. Submit pull requests with detailed descriptions

## License

This system is part of NocoDB and follows the same license terms.
