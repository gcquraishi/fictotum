#!/bin/bash

# Google Cloud Credentials Update Script
# Updates local and Vercel environment variables after Google Cloud migration

set -e  # Exit on error

echo "================================================"
echo "Google Cloud Credentials Migration Helper"
echo "================================================"
echo ""
echo "This script will help you update Google credentials"
echo "for Fictotum after migrating from george.quraishi@gmail.com"
echo "to george@bigheavy.fun"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/web-app/.env.local"
BACKUP_FILE="$PROJECT_ROOT/web-app/.env.local.backup.$(date +%Y%m%d_%H%M%S)"

echo "Project root: $PROJECT_ROOT"
echo "Environment file: $ENV_FILE"
echo ""

# Function to prompt for input
prompt_credential() {
    local var_name=$1
    local description=$2
    local value=""

    echo -e "${YELLOW}Enter $description:${NC}"
    read -r value

    if [ -z "$value" ]; then
        echo -e "${RED}Error: Value cannot be empty${NC}"
        exit 1
    fi

    echo "$value"
}

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Backup current .env.local${NC}"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"
echo ""

echo -e "${GREEN}Step 2: Collect new credentials${NC}"
echo "Please have your Google Cloud Console open with the new credentials"
echo ""

NEW_GOOGLE_CLIENT_ID=$(prompt_credential "GOOGLE_CLIENT_ID" "new Google OAuth Client ID")
echo ""

NEW_GOOGLE_CLIENT_SECRET=$(prompt_credential "GOOGLE_CLIENT_SECRET" "new Google OAuth Client Secret")
echo ""

NEW_GEMINI_API_KEY=$(prompt_credential "GEMINI_API_KEY" "new Gemini API Key")
echo ""

echo -e "${GREEN}Step 3: Update .env.local${NC}"

# Update GOOGLE_CLIENT_ID
if grep -q "^GOOGLE_CLIENT_ID=" "$ENV_FILE"; then
    sed -i.tmp "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$NEW_GOOGLE_CLIENT_ID|" "$ENV_FILE"
    echo "✓ Updated GOOGLE_CLIENT_ID"
else
    echo -e "${YELLOW}Warning: GOOGLE_CLIENT_ID not found, appending${NC}"
    echo "GOOGLE_CLIENT_ID=$NEW_GOOGLE_CLIENT_ID" >> "$ENV_FILE"
fi

# Update GOOGLE_CLIENT_SECRET
if grep -q "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE"; then
    sed -i.tmp "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$NEW_GOOGLE_CLIENT_SECRET|" "$ENV_FILE"
    echo "✓ Updated GOOGLE_CLIENT_SECRET"
else
    echo -e "${YELLOW}Warning: GOOGLE_CLIENT_SECRET not found, appending${NC}"
    echo "GOOGLE_CLIENT_SECRET=$NEW_GOOGLE_CLIENT_SECRET" >> "$ENV_FILE"
fi

# Update GEMINI_API_KEY
if grep -q "^GEMINI_API_KEY=" "$ENV_FILE"; then
    sed -i.tmp "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$NEW_GEMINI_API_KEY|" "$ENV_FILE"
    echo "✓ Updated GEMINI_API_KEY"
else
    echo -e "${YELLOW}Warning: GEMINI_API_KEY not found, appending${NC}"
    echo "GEMINI_API_KEY=$NEW_GEMINI_API_KEY" >> "$ENV_FILE"
fi

# Clean up temporary files
rm -f "$ENV_FILE.tmp"

echo ""
echo -e "${GREEN}Step 4: Verification${NC}"
echo "Current credentials in $ENV_FILE:"
echo ""
grep "^GOOGLE_CLIENT_ID=" "$ENV_FILE" || echo "GOOGLE_CLIENT_ID not found"
grep "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE" | sed 's/=.*/=***REDACTED***/' || echo "GOOGLE_CLIENT_SECRET not found"
grep "^GEMINI_API_KEY=" "$ENV_FILE" | sed 's/=.*/=***REDACTED***/' || echo "GEMINI_API_KEY not found"
echo ""

echo -e "${GREEN}Step 5: Update Vercel (optional)${NC}"
read -p "Do you want to update Vercel environment variables now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Updating Vercel production environment..."
    echo "You'll be prompted to enter each value."
    echo ""

    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}Error: Vercel CLI not found. Install with: npm i -g vercel${NC}"
        exit 1
    fi

    echo "Adding GOOGLE_CLIENT_ID to production..."
    echo "$NEW_GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production

    echo "Adding GOOGLE_CLIENT_SECRET to production..."
    echo "$NEW_GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production

    echo "Adding GEMINI_API_KEY to production..."
    echo "$NEW_GEMINI_API_KEY" | vercel env add GEMINI_API_KEY production

    echo ""
    echo -e "${GREEN}✓ Vercel environment variables updated${NC}"
    echo ""
    echo "To apply changes, trigger a new deployment:"
    echo "  vercel --prod"
fi

echo ""
echo "================================================"
echo -e "${GREEN}Migration Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Test locally: cd web-app && npm run dev"
echo "2. Test Google OAuth at http://localhost:3000"
echo "3. If everything works, deploy to Vercel: vercel --prod"
echo "4. Test production at https://fictotum.vercel.app"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
echo "If you need to rollback:"
echo "  cp $BACKUP_FILE $ENV_FILE"
echo ""
