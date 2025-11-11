#!/bin/bash

# ========================================
# Build Script for Cloudflare Pages
# ========================================
# This script injects environment variables into the config

echo "🔨 Building config for production..."

# Create a production config with environment variables
cat > config-env.js << 'EOF'
// Auto-generated config with environment variables
window.ENV_AIRTABLE_API_KEY = '${AIRTABLE_API_KEY}';
window.ENV_AIRTABLE_BASE_ID = '${AIRTABLE_BASE_ID}';
EOF

# Replace environment variable placeholders
sed -i "s/\${AIRTABLE_API_KEY}/$AIRTABLE_API_KEY/g" config-env.js
sed -i "s/\${AIRTABLE_BASE_ID}/$AIRTABLE_BASE_ID/g" config-env.js

echo "✅ Config built successfully!"
echo "🚀 Ready for deployment"
