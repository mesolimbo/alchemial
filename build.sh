#!/bin/bash

# Build script for Alchemial deployment

echo "🔥 Building Alchemial for Dreamhost deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -f dist/client/bundle.js dist/client/bundle.css dist/bundle.js dist/bundle.css dist/index.html

# Build client with bun
echo "📦 Building client code with bun..."
cd client
bun install
bun run build
cd ..

# Generate favicon from emoji
echo "🎨 Generating favicon..."
cat > dist/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">⚗️</text>
</svg>
EOF

# Create the HTML file for root
echo "📄 Creating index.html in root..."
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>⚗️ Alchemial 🧪️</title>
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="bundle.css">
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="bundle.js"></script>
  </body>
</html>
EOF

# Copy server files
echo "🐍 Copying server files..."
mkdir -p dist/server

# Process api.py with Python path substitution
echo "🔧 Processing api.py with Python path..."
if [ -f .env ]; then
  # Extract PYTHON_PATH from .env file
  PYTHON_PATH=$(grep "^PYTHON_PATH=" .env | cut -d'=' -f2- | tr -d '"')
  if [ -n "$PYTHON_PATH" ]; then
    # Replace placeholder with actual Python path
    sed "s|#!<.env PYTHON_PATH>|#!$PYTHON_PATH|g" server/src/api.py > dist/server/api.py
    echo "  ✓ Set Python path to: $PYTHON_PATH"
  else
    echo "  ⚠️  PYTHON_PATH not found in .env, using file as-is"
    cp server/src/api.py dist/server/
  fi
else
  echo "  ⚠️  .env file not found, using api.py as-is"
  cp server/src/api.py dist/server/
fi

# Copy Python dependencies from project root
echo "📦 Copying Python dependencies..."
cp Pipfile dist/
if [ -f .env ]; then
  cp .env dist/
fi

# Client files are now built directly to dist/ - no copying needed!

# Create .htaccess for proper routing
echo "⚙️ Creating .htaccess with basic auth..."

# Read auth credentials from .env if available
AUTH_USERNAME=""
AUTH_PASSWORD=""
SERVER_ROOT=""
if [ -f .env ]; then
  AUTH_USERNAME=$(grep "^USERNAME=" .env | cut -d'=' -f2- | tr -d '"')
  AUTH_PASSWORD=$(grep "^PASSWORD=" .env | cut -d'=' -f2- | tr -d '"')
  SERVER_ROOT=$(grep "^SERVER_ROOT=" .env | cut -d'=' -f2- | tr -d '"')
fi

# Determine AuthUserFile path
if [ -n "$SERVER_ROOT" ]; then
  AUTH_USER_FILE="$SERVER_ROOT/.htpasswd"
else
  AUTH_USER_FILE=".htpasswd"
fi

cat > dist/.htaccess << EOF
# Enable CGI execution
Options +ExecCGI
AddHandler cgi-script .py

# Add proper MIME types
AddType application/javascript .js
AddType text/css .css

# Basic Authentication
AuthType Basic
AuthName "Alchemial - Private Access"
AuthUserFile $AUTH_USER_FILE
Require valid-user

RewriteEngine On

# API calls to Python CGI
RewriteRule ^api/(.*)$ server/api.py [L]

# All other requests fall back to index.html for SPA routing
# But we need to exclude actual files that exist
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/server/
RewriteRule ^(.*)$ index.html [L]
EOF

# Create .htpasswd file if credentials are available
if [ -n "$AUTH_USERNAME" ] && [ -n "$AUTH_PASSWORD" ]; then
  echo "🔐 Creating .htpasswd with basic auth credentials..."
  # Generate password hash using openssl (compatible with most systems)
  HASHED_PASSWORD=$(openssl passwd -apr1 "$AUTH_PASSWORD" 2>/dev/null || python3 -c "import crypt; print(crypt.crypt('$AUTH_PASSWORD', crypt.mksalt(crypt.METHOD_MD5)))" 2>/dev/null || echo '$AUTH_PASSWORD')
  echo "$AUTH_USERNAME:$HASHED_PASSWORD" > dist/.htpasswd
  echo "  ✓ Created .htpasswd for user: $AUTH_USERNAME"
else
  echo "  ⚠️  USERNAME or PASSWORD not found in .env, basic auth not configured"
fi

echo "✅ Build complete! Upload the 'dist' directory contents to your Dreamhost public_html folder."
echo ""
echo "📁 File structure:"
echo "  dist/index.html     - Main HTML file"
echo "  dist/bundle.js      - JavaScript bundle"
echo "  dist/bundle.css     - CSS bundle"
echo "  dist/favicon.svg    - Site favicon"
echo "  dist/Pipfile        - Python dependencies"
echo "  dist/.env           - Environment variables"
echo "  dist/.htpasswd      - Basic auth credentials"
echo "  dist/server/        - Python CGI scripts"  
echo "  dist/.htaccess      - Apache configuration with auth"
echo ""
echo "🔧 Setup steps:"
echo "  1. Set up your Python virtual environment on Dreamhost"
echo "  2. Install dependencies: pipenv install"
echo "  3. Set ANTHROPIC_API_KEY environment variable"
echo "  4. Ensure CGI permissions are correct (755 for .py files)"
echo "  5. Ensure env permissions are correct (640 for .env file)"
