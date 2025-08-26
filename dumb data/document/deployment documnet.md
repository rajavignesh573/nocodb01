env file for root

   # AI Configuration
   ENABLE_AI_ASSISTANT=true
   AI_PROVIDER=openai
   DEFAULT_AI_MODEL=gpt-4o-mini
   AI_MAX_TOKENS=1000
   AI_TEMPERATURE=0.7
   
   # Your OpenAI API Key
   OPENAI_API_KEY=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
   OPENAI_BASE_URL=https://api.openai.com/v1
   
   # Other settings
   AI_TIMEOUT=30000
   AI_RETRIES=3
   NC_DISABLE_TELE=true


---------------------------------------

.env file for nc-gui

NUXT_PUBLIC_NC_BACKEND_URL=http://localhost:8080
NC_DB="pg://postgres:postgres@localhost:5432/nocodb"
NC_AUTH_JWT_SECRET="dev_secret_key"
NC_PORT=8080

ENABLE_AI_ASSISTANT=true
OPENAI_API_KEY=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
DEFAULT_AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

-----------------------------


env file for nocodb

# NocoDB + Product Matching Merged Server Configuration
# Copy this file to .env and modify as needed

# =============================================================================
# NocoDB Configuration
# =============================================================================

# NocoDB Port (default: 8080)
NOCODB_PORT=8080

# NocoDB Database Configuration (PostgreSQL)
NOCODB_DB_TYPE=postgres
NOCODB_DB_HOST=localhost
NOCODB_DB_PORT=5432
NOCODB_DB_USER=postgres
NOCODB_DB_PASSWORD=postgres
NOCODB_DB_NAME=nocodb

# =============================================================================
# Product Matching Configuration
# =============================================================================

# Product Matching Port (default: 3001)
PM_PORT=3001

# Product Matching Database (PostgreSQL)
PM_DB_HOST=localhost
PM_DB_PORT=5432
PM_DB_NAME=testdb01
PM_DB_USER=postgres
PM_DB_PASSWORD=postgres

# =============================================================================
# Other Settings
# =============================================================================

# Node Environment
NODE_ENV=development

# Disable telemetry
NC_DISABLE_TELE=true



--------------------------------------------------------------------------

E:\noco-fresh\nocodb\packages\nc-gui\extensions\product-matcher\composables\useProductMatchingApi.ts

line number 86  - ui to backend api connection.