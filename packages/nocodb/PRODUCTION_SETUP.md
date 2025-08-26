# Production Setup Guide for NL Orchestration System

## Overview

This guide will help you configure the Natural Language → NocoDB API Orchestration system for production use.

## Prerequisites

1. **NocoDB Installation**: Ensure you have a working NocoDB installation
2. **OpenAI API Key**: Valid OpenAI API key with sufficient credits
3. **Database Access**: Proper database permissions for the NocoDB instance
4. **Environment Variables**: Ability to set environment variables

## Step 1: Environment Configuration

Create a `.env` file in your NocoDB root directory with the following variables:

```env
# =============================================================================
# AI Assistant Configuration
# =============================================================================
ENABLE_AI_ASSISTANT=true
AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.1
AI_TIMEOUT=60000
AI_RETRIES=3

# =============================================================================
# OpenAI Configuration
# =============================================================================
# Replace with your actual OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# =============================================================================
# NocoDB Core Configuration
# =============================================================================
NC_DISABLE_TELE=true
NC_DATABASE_URL=your-database-url-here
NC_REDIS_URL=your-redis-url-here

# =============================================================================
# Security Configuration
# =============================================================================
NC_JWT_SECRET=your-jwt-secret-here
NC_JWT_EXPIRES_IN=10y

# =============================================================================
# Server Configuration
# =============================================================================
NC_PORT=8080
NC_HOST=0.0.0.0

# =============================================================================
# NL Orchestration System Configuration
# =============================================================================
# Schema catalog cache TTL in milliseconds (5 minutes)
NL_SCHEMA_CACHE_TTL=300000

# Maximum number of steps in a query plan
NL_MAX_QUERY_STEPS=10

# Default output format for NL queries
NL_DEFAULT_FORMAT=table

# Enable debug logging for NL orchestration
NL_DEBUG_LOGGING=false

# =============================================================================
# Performance Configuration
# =============================================================================
# Maximum number of concurrent API calls
NL_MAX_CONCURRENT_CALLS=5

# Request timeout for NocoDB API calls
NL_API_TIMEOUT=30000

# =============================================================================
# Error Handling Configuration
# =============================================================================
# Enable fallback to mock data on API failures
NL_ENABLE_MOCK_FALLBACK=true

# Maximum retry attempts for failed API calls
NL_MAX_RETRY_ATTEMPTS=3
```

## Step 2: OpenAI API Key Setup

1. **Get Your API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the generated API key

2. **Replace the Placeholder**:
   - In your `.env` file, replace `sk-your-actual-openai-api-key-here` with your actual API key
   - Ensure the key starts with `sk-`

3. **Verify API Key**:
   ```bash
   # Test your API key
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.openai.com/v1/models
   ```

## Step 3: Database Configuration

Ensure your database is properly configured:

```env
# For PostgreSQL
NC_DATABASE_URL=postgresql://username:password@localhost:5432/nocodb

# For MySQL
NC_DATABASE_URL=mysql://username:password@localhost:3306/nocodb

# For SQLite
NC_DATABASE_URL=sqlite://./nocodb.db
```

## Step 4: Security Configuration

Generate secure secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate other secrets as needed
openssl rand -base64 64
```

## Step 5: Performance Tuning

Adjust these settings based on your usage:

```env
# For high-traffic applications
AI_MAX_TOKENS=4000
AI_TIMEOUT=120000
NL_MAX_CONCURRENT_CALLS=10
NL_SCHEMA_CACHE_TTL=600000  # 10 minutes

# For development/testing
AI_MAX_TOKENS=1000
AI_TIMEOUT=30000
NL_MAX_CONCURRENT_CALLS=3
NL_SCHEMA_CACHE_TTL=60000   # 1 minute
```

## Step 6: Start the Application

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Build the Application**:
   ```bash
   pnpm run build
   ```

3. **Start the Server**:
   ```bash
   pnpm run start
   ```

## Step 7: Verify Installation

1. **Health Check**:
   ```bash
   curl -X GET "http://localhost:8080/api/v1/db/data/v1/default/default/ai/health"
   ```

2. **Test NL Query**:
   ```bash
   curl -X POST "http://localhost:8080/api/v1/db/data/v1/noco/default/nl-query" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -d '{
          "query": "list all bases",
          "format": "table"
        }'
   ```

## Step 8: Monitoring and Logging

### Enable Debug Logging

For troubleshooting, enable debug logging:

```env
NL_DEBUG_LOGGING=true
```

### Monitor API Usage

Track OpenAI API usage:
- Monitor your OpenAI dashboard for usage and costs
- Set up billing alerts
- Monitor NocoDB logs for errors

### Performance Monitoring

Monitor these metrics:
- Response times for NL queries
- Schema catalog refresh frequency
- API call success rates
- Memory usage

## Step 9: Production Deployment

### Docker Deployment

```dockerfile
# Use the official NocoDB image
FROM nocodb/nocodb:latest

# Copy your .env file
COPY .env /app/.env

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
```

### Environment-Specific Configurations

Create different `.env` files for different environments:

- `.env.development`
- `.env.staging`
- `.env.production`

## Troubleshooting

### Common Issues

1. **OpenAI API Key Not Working**:
   - Verify the API key is correct
   - Check if you have sufficient credits
   - Ensure the key has the right permissions

2. **Database Connection Issues**:
   - Verify database URL format
   - Check database permissions
   - Ensure database is running

3. **Schema Catalog Not Loading**:
   - Check user permissions
   - Verify base/table access
   - Enable debug logging for details

4. **Slow Response Times**:
   - Increase `AI_TIMEOUT`
   - Reduce `AI_MAX_TOKENS`
   - Optimize database queries

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? 'API Key Set' : 'API Key Missing')"

# Test OpenAI connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Check NocoDB logs
tail -f logs/nocodb.log
```

## Security Considerations

1. **API Key Security**:
   - Never commit API keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **Access Control**:
   - Implement proper authentication
   - Use role-based access control
   - Monitor API usage

3. **Data Privacy**:
   - Review what data is sent to OpenAI
   - Implement data filtering if needed
   - Comply with data protection regulations

## Support

For issues and questions:
1. Check the NocoDB documentation
2. Review the NL Orchestration README
3. Check GitHub issues
4. Contact the development team

## Updates and Maintenance

1. **Regular Updates**:
   - Keep NocoDB updated
   - Monitor for security patches
   - Update dependencies regularly

2. **Backup Strategy**:
   - Regular database backups
   - Configuration backups
   - API key rotation schedule

3. **Monitoring**:
   - Set up health checks
   - Monitor error rates
   - Track performance metrics
