# NocoDB + Product Matching Merged Server

This merged server combines NocoDB and the Product Matching service into a single process, running on different ports with separate databases.

## 🚀 Features

- **Single Process**: Both services run in one process
- **Separate Ports**: NocoDB and Product Matching run on different ports
- **Individual Databases**: Each service has its own database
- **Easy Configuration**: Configure via environment variables
- **Graceful Shutdown**: Proper cleanup when stopping

## 📋 Prerequisites

1. **Node.js** (version 22 or higher)
2. **PostgreSQL** (for both NocoDB and Product Matching services)

## 🛠 Installation & Setup

### 1. Install Dependencies

```bash
cd packages/nocodb
npm install
```

### 2. Setup PostgreSQL Databases

Both services require PostgreSQL. Create the databases:

```sql
CREATE DATABASE nocodb;
CREATE DATABASE product_matching;
```

### 3. Configure Environment

Copy the example configuration:

```bash
cp merged-config.example.env .env
```

Edit `.env` with your database settings:

```env
# NocoDB Configuration
NOCODB_PORT=8080
NOCODB_DB_TYPE=postgres
NOCODB_DB_HOST=localhost
NOCODB_DB_PORT=5432
NOCODB_DB_USER=postgres
NOCODB_DB_PASSWORD=your_password
NOCODB_DB_NAME=nocodb

# Product Matching Configuration
PM_PORT=3001
PM_DB_HOST=localhost
PM_DB_PORT=5432
PM_DB_NAME=product_matching
PM_DB_USER=postgres
PM_DB_PASSWORD=your_password
```

## 🚀 Quick Start

### Start the Merged Server

```bash
npm run start:merged
```

### Access Your Services

- **NocoDB Dashboard**: http://localhost:8080/dashboard
- **Product Matching API**: http://localhost:3001

## ⚙️ Configuration Options

### NocoDB Configuration

#### Port
```env
NOCODB_PORT=8080
```

#### Database Configuration (PostgreSQL)

```env
NOCODB_DB_TYPE=postgres
NOCODB_DB_HOST=localhost
NOCODB_DB_PORT=5432
NOCODB_DB_USER=postgres
NOCODB_DB_PASSWORD=password
NOCODB_DB_NAME=nocodb
```

### Product Matching Configuration

#### Port
```env
PM_PORT=3001
```

#### Database (PostgreSQL)
```env
PM_DB_HOST=localhost
PM_DB_PORT=5432
PM_DB_NAME=product_matching
PM_DB_USER=postgres
PM_DB_PASSWORD=password
```

## 📡 API Endpoints

### NocoDB Endpoints
- **Dashboard**: `http://localhost:8080/dashboard`
- **API**: `http://localhost:8080/api/v1/...`
- **Health Check**: `http://localhost:8080/api/health`

### Product Matching Endpoints
- **Health Check**: `http://localhost:3001/health`
- **Info**: `http://localhost:3001/info`
- **Products**: `http://localhost:3001/products`
- **Candidates**: `http://localhost:3001/products/:productId/candidates`
- **Matches**: `http://localhost:3001/matches`

## 🔧 Development

### Building

```bash
npm run build
```

### Running in Development

```bash
npm run start:merged
```

### Stopping the Server

Press `Ctrl+C` to gracefully stop both services.

## 📊 Monitoring

The server provides console output for monitoring:

```
🚀 Starting Merged NocoDB + Product Matching Server...
📊 NocoDB will run on port 8080
🔍 Product Matching will run on port 3001
🔧 Starting NocoDB on port 8080 with database: nocodb
✅ NocoDB listening on port 8080
✅ NocoDB initialized successfully
🌐 Dashboard available at: http://localhost:8080/dashboard
🔍 Starting Product Matching on port 3001 with database: product_matching
✅ Product Matching API listening on port 3001
✅ Both servers started successfully!
🌐 NocoDB Dashboard: http://localhost:8080/dashboard
🔍 Product Matching API: http://localhost:3001
```

## 🛡️ Security Considerations

- Each service has its own JWT secret
- Database connections are isolated
- Use environment variables for sensitive data
- Consider using HTTPS in production
- Implement proper authentication and authorization

## 🔍 Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Check what's using the port
lsof -i :8080
lsof -i :3001

# Kill the process or change ports in .env
```

### Database Connection Issues

**NocoDB Database Issues:**
1. Ensure the database server is running
2. Check connection details in `.env`
3. Verify database exists and user has permissions

**Product Matching Database Issues:**
1. Ensure PostgreSQL is running
2. Check if database `product_matching` exists
3. Verify user credentials in `.env`

### Service Not Starting

1. Check console output for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check database connectivity

## 📝 Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NOCODB_PORT` | NocoDB server port | `8080` |
| `NOCODB_DB_TYPE` | NocoDB database type | `postgres` |
| `NOCODB_DB_HOST` | Database host | `localhost` |
| `NOCODB_DB_PORT` | Database port | `5432` |
| `NOCODB_DB_USER` | Database user | `postgres` |
| `NOCODB_DB_PASSWORD` | Database password | `password` |
| `NOCODB_DB_NAME` | Database name | `nocodb` |
| `PM_PORT` | Product Matching port | `3001` |
| `PM_DB_HOST` | Product Matching DB host | `localhost` |
| `PM_DB_PORT` | Product Matching DB port | `5432` |
| `PM_DB_NAME` | Product Matching DB name | `product_matching` |
| `PM_DB_USER` | Product Matching DB user | `postgres` |
| `PM_DB_PASSWORD` | Product Matching DB password | `password` |
| `NODE_ENV` | Node environment | `development` |
| `NC_DISABLE_TELE` | Disable telemetry | `true` |

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong passwords for databases
3. Configure HTTPS
4. Set up proper logging
5. Use environment-specific database configurations
6. Consider using a process manager like PM2

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your configuration in `.env`
3. Ensure all prerequisites are met
4. Check database connectivity
5. Review the troubleshooting section above
