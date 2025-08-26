@echo off
echo ========================================
echo nc-product-matching Quick Start
echo ========================================
echo.

echo Step 1: Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building TypeScript code...
npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build TypeScript code
    pause
    exit /b 1
)

echo.
echo Step 3: Setting up database...
echo Please make sure PostgreSQL is running and update config.js with your password
echo Press any key to continue...
pause

npm run setup-db
if %errorlevel% neq 0 (
    echo Error: Failed to setup database
    echo Please check your PostgreSQL connection settings in config.js
    pause
    exit /b 1
)

echo.
echo Step 4: Starting the server...
echo Server will start on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.
npm start
